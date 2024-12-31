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
    
    constructor() ERC721("NoteNFT", "NOTE") Ownable(msg.sender) {}
    
    function createNote(
        string memory tokenURI, 
        string memory contentHash, 
        uint256 maxSupply,
        uint256 price
    ) public returns (uint256) {
        require(contentToTokenId[contentHash] == 0, "Note already exists");
        require(maxSupply > 0, "Max supply must be greater than 0");
        
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
        
        emit NoteCreated(newItemId, msg.sender, maxSupply, price);
        return newItemId;
    }
    
    function mintNote(uint256 tokenId) public payable {
        Note storage note = notes[tokenId];
        require(note.isActive, "Note is not active");
        require(note.currentSupply < note.maxSupply, "Max supply reached");
        require(msg.value >= note.price, "Insufficient payment");
        
        note.currentSupply += 1;
        hasAccess[tokenId][msg.sender] = true;
        
        // Transfer payment to note author
        payable(note.author).transfer(msg.value);
        
        emit NoteMinted(tokenId, msg.sender);
    }
    
    function hasNoteAccess(uint256 tokenId, address user) public view returns (bool) {
        return hasAccess[tokenId][user];
    }
    
    function getNoteDetails(uint256 tokenId) public view returns (
        address author, 
        bool isActive, 
        uint256 maxSupply, 
        uint256 currentSupply,
        uint256 price
    ) {
        Note memory note = notes[tokenId];
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
        notes[tokenId].price = newPrice;
    }
} 