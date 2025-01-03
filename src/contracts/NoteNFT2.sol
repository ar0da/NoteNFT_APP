// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract NoteNFT is ERC721URIStorage, Ownable {
    using Counters for Counters.Counter;
    Counters.Counter private _tokenIds;
    
    struct Note {
        string contentHash;
        address author;
        bool isActive;
        uint256 maxSupply;
        uint256 currentSupply;
        uint256 price;
    }
    
    mapping(uint256 => Note) public notes;
    mapping(string => uint256) public contentToTokenId;
    mapping(uint256 => mapping(address => bool)) public hasAccess;
    
    event NoteCreated(uint256 tokenId, address author, uint256 maxSupply, uint256 price);
    event NoteMinted(uint256 tokenId, address minter);
    event AccessGranted(uint256 tokenId, address user);
    event AccessRevoked(uint256 tokenId, address user);
    
    constructor() ERC721("NoteNFT2", "NOTE2") Ownable(msg.sender) {}
    
    function _update(address to, uint256 tokenId, address auth) internal virtual override returns (address) {
        address from = super._update(to, tokenId, auth);
        
        // Eğer yeni bir mint işlemi değilse (from != address(0))
        if (from != address(0)) {
            // Eski sahibin erişimini kaldır
            hasAccess[tokenId][from] = false;
            emit AccessRevoked(tokenId, from);
        }
        
        // Eğer token yakılmıyorsa (to != address(0))
        if (to != address(0)) {
            // Yeni sahibine erişim ver
            hasAccess[tokenId][to] = true;
            emit AccessGranted(tokenId, to);
        }
        
        return from;
    }
    
    function createNote(
        string memory tokenURI, 
        string memory contentHash, 
        uint256 maxSupply,
        uint256 price
    ) public returns (uint256) {
        require(contentToTokenId[contentHash] == 0, "Note already exists");
        require(maxSupply > 0, "Max supply must be greater than 0");
        require(price > 0, "Price must be greater than 0");
        
        _tokenIds.increment();
        uint256 newItemId = _tokenIds.current();
        
        _mint(msg.sender, newItemId);
        _setTokenURI(newItemId, tokenURI);
        
        notes[newItemId] = Note({
            contentHash: contentHash,
            author: msg.sender,
            isActive: true,
            maxSupply: maxSupply,
            currentSupply: 1,
            price: price
        });
        
        contentToTokenId[contentHash] = newItemId;
        hasAccess[newItemId][msg.sender] = true;
        emit AccessGranted(newItemId, msg.sender);
        
        emit NoteCreated(newItemId, msg.sender, maxSupply, price);
        return newItemId;
    }
    
    function mintNote(uint256 tokenId) public payable {
        Note storage note = notes[tokenId];
        require(note.author != address(0), "Note does not exist");
        require(note.isActive, "Note is not active");
        require(note.currentSupply < note.maxSupply, "Max supply reached");
        require(msg.value >= note.price, "Insufficient payment");
        
        note.currentSupply += 1;
        hasAccess[tokenId][msg.sender] = true;
        emit AccessGranted(tokenId, msg.sender);
        
        // Transfer payment to note author
        payable(note.author).transfer(msg.value);
        
        emit NoteMinted(tokenId, msg.sender);
    }
    
    function hasNoteAccess(uint256 tokenId, address user) public view returns (bool) {
        Note memory note = notes[tokenId];
        // Yazar kontrolü
        if (note.author == user) {
            return true;
        }
        
        // NFT sahiplik kontrolü - ownerOf kullanılmalı
        try this.ownerOf(tokenId) returns (address owner) {
            if (owner == user) {
                return true;
            }
        } catch {
            // Token mevcut değilse veya mint edilmemişse
        }
        
        // Özel erişim kontrolü
        return hasAccess[tokenId][user];
    }
    
    function getNoteDetails(uint256 tokenId) public view returns (
        address author, 
        bool isActive, 
        uint256 maxSupply, 
        uint256 currentSupply,
        uint256 price
    ) {
        require(tokenId <= _tokenIds.current(), "Note does not exist");
        Note memory note = notes[tokenId];
        require(note.author != address(0), "Note has been deleted");
        
        return (
            note.author, 
            note.isActive, 
            note.maxSupply, 
            note.currentSupply,
            note.price
        );
    }
    
    function toggleNoteActive(uint256 tokenId) public {
        require(msg.sender == notes[tokenId].author, "Only author can toggle active status");
        notes[tokenId].isActive = !notes[tokenId].isActive;
    }
    
    function updateNotePrice(uint256 tokenId, uint256 newPrice) public {
        require(msg.sender == notes[tokenId].author, "Only author can update price");
        require(newPrice > 0, "Price must be greater than 0");
        notes[tokenId].price = newPrice;
    }
} 