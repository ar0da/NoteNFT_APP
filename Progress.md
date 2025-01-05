# Project Progress Log

## 1. Contract Updates

### NoteNFT2 Contract (14.01.2024 Update - New Version)
- New contract address: `0xfDe024484852aA774569F3a7Ce34EFC63083C644`
- Previous contract address: `0x4BdfE6148412B5dF82358c661F840266bC3b0Fa9`
- Token name: "NoteNFT2"
- Token symbol: "NOTE2"

#### Known Issues and Solutions:
1. TokenId Conflict
   - Issue: When new contract is deployed, tokenIds start from 1 but old tokenIds exist in database
   - Solution Steps:
     1. Create database cleanup endpoint in backend (`/api/notes/clear`)
     2. Clean old notes
     3. Continue with new notes through new contract

2. Transition Process
   - Backup old notes
   - Clean database
   - Recreate notes with new contract

#### To Do:
1. Backend Updates
   - [ ] Add `/api/notes/clear` endpoint
   - [ ] Security controls for database cleanup
   - [ ] Backup mechanism

2. Frontend Updates
   - [ ] Temporary solution for viewing old notes
   - [ ] User information about transition process
   - [ ] Improve error messages

#### Recent Updates:
1. NFT access control improved
   - Ownership check with `ownerOf` function
   - More secure access management
   - Fixed access issues after wallet connection

2. Contract redeployed
   - New address: `0xfDe024484852aA774569F3a7Ce34EFC63083C644`
   - Web3 service updated
   - Access controls tested

#### Improvements Made:
1. Token transfer logic updated
   - Added `_update` function
   - Access rights automatically update during transfer
   - Old owner's access is removed
   - New owner is granted access

2. Access Controls Improved
   - Updated `hasNoteAccess` function
   - Added token ownership check
   - Added author check
   - Added access rights check

3. Security Improvements
   - Added note and price checks
   - Added Token ID and deleted note checks
   - Added zero address checks

4. Events Added
   - `AccessGranted`: When a user is granted access
   - `AccessRevoked`: When a user's access is revoked

## 2. Frontend Updates

### Web3 Service
1. Contract Integration
   - Updated new contract address
   - Added new ABI file (`NoteNFT2.json`)
   - Updated `hasNoteAccess` function

2. Access Controls
   - Updated token ownership check
   - Improved access rights management
   - Fixed access control after wallet connection

## 3. Known Issues and Solutions

1. Wallet Connection
   - Issue: Notes couldn't be viewed when wallet disconnected and reconnected
   - Solution: Updated access control logic and added contract level check

2. NFT Minting Process
   - Issue: Gas estimation errors
   - Solution: Improved gas calculation logic and error handling

## 4. To Do

1. Performance Improvements
   - [ ] Gas optimization
   - [ ] Support for batch operations

2. Security
   - [ ] Conduct audit
   - [ ] Security tests

3. User Experience
   - [ ] Improve error messages
   - [ ] Improve loading states

## 5. Guide to Reverting to Old Contract

### Old Contract Information
- Contract Address: `0x08484A4f98800754f94Aa781995D78C3a49a5113`
- ABI File: `src/contracts/NoteNFT.json`

### Reversion Steps
1. Web3 Service Update
   ```javascript
   // src/services/web3Service.js
   import NoteNFTContract from '../contracts/NoteNFT.json';
   const contractAddress = "0x08484A4f98800754f94Aa781995D78C3a49a5113";
   ```

2. hasNoteAccess Function
   ```javascript
   export const hasNoteAccess = async (tokenId, account) => {
       try {
           // Check NFT ownership
           const balance = await contract.methods.balanceOf(account, tokenId).call();
           const hasToken = BigInt(balance) > BigInt(0);
           
           // Check note details
           const noteDetails = await contract.methods.notes(tokenId).call();
           const isCreator = noteDetails.author.toLowerCase() === account.toLowerCase();
           
           return hasToken || isCreator;
       } catch (error) {
           console.error('Note access check error:', error);
           return false;
       }
   };
   ```

### Important Notes
1. When reverting to old contract:
   - New events won't be available
   - Token transfer logic will be simpler
   - Access controls will be manual

2. Points to Consider:
   - Different gas limits in old contract
   - Simpler error handling
   - Less detailed events

### NFT Access Control Update (14.01.2024)

1. Updated `hasNoteAccess` Function in Smart Contract
   ```solidity
   function hasNoteAccess(uint256 tokenId, address user) public view returns (bool) {
       Note memory note = notes[tokenId];
       // Author check
       if (note.author == user) {
           return true;
       }
       
       // NFT ownership check - use ownerOf
       try this.ownerOf(tokenId) returns (address owner) {
           if (owner == user) {
               return true;
           }
       } catch {
           // Token doesn't exist or not minted
       }
       
       // Special access check
       return hasAccess[tokenId][user];
   }
   ```

2. Updated `hasNoteAccess` Function in Web3 Service
   ```javascript
   export const hasNoteAccess = async (tokenId, account) => {
       try {
           // Call hasNoteAccess function in smart contract
           const hasAccess = await contract.methods.hasNoteAccess(tokenId, account).call();
           return hasAccess;
       } catch (error) {
           console.error('Note access check error:', error);
           return false;
       }
   };
   ```

3. Updated Access Control in App.js
   ```javascript
   // Use hasNoteAccess function from smart contract
   const hasAccess = await contract.methods.hasNoteAccess(note.tokenId, walletAddress).call();
   accessMap[note.tokenId] = hasAccess;
   ```

### Improvements Made
1. NFT ownership check now uses `ownerOf` function
2. Access control is more secure and consistent
3. Access rights are preserved when wallet reconnects
4. Improved error handling

### Important Notes
1. Smart contract needs to be redeployed
2. New contract address should be updated in web3Service.js
3. Access rights for old NFTs will be updated automatically

### NFT Mint Status Display (14.01.2024)
- Note mint status is now displayed
- Added sold out status check
- Added mint count information

#### Updates Made:

1. NoteCard Component Update
   ```javascript
   const NoteCard = ({ note }) => {
       const [mintInfo, setMintInfo] = useState({ currentSupply: 0, maxSupply: 0 });

       useEffect(() => {
           const getMintInfo = async () => {
               if (!note?.tokenId || !contract) {
                   console.log('Contract or tokenId missing:', { contract, tokenId: note?.tokenId });
                   return;
               }

               try {
                   const details = await contract.methods.getNoteDetails(note.tokenId).call();
                   console.log('Mint info retrieved:', details);
                   setMintInfo({
                       currentSupply: Number(details.currentSupply),
                       maxSupply: Number(details.maxSupply)
                   });
               } catch (error) {
                   console.error('Could not get mint info:', error);
               }
           };

           getMintInfo();
       }, [note?.tokenId, contract]);
   };
   ```

2. Dialog Content Update
   ```javascript
   const NoteDialogContent = ({ note }) => {
       const [mintInfo, setMintInfo] = useState({ currentSupply: 0, maxSupply: 0 });
       
       useEffect(() => {
           const getMintInfo = async () => {
               if (!note?.tokenId || !contract) {
                   console.log('Contract or tokenId missing:', { contract, tokenId: note?.tokenId });
                   return;
               }

               try {
                   const details = await contract.methods.getNoteDetails(note.tokenId).call();
                   setMintInfo({
                       currentSupply: Number(details.currentSupply),
                       maxSupply: Number(details.maxSupply)
                   });
               } catch (error) {
                   console.error('Could not get dialog mint info:', error);
               }
           };

           getMintInfo();
       }, [note?.tokenId, contract]);
   };
   ```

3. Contract Initialization Improvement
   ```javascript
   useEffect(() => {
       const initContract = async () => {
           try {
               const contractInstance = await getContract();
               console.log('Contract successfully initialized:', contractInstance?.options?.address);
               setContract(contractInstance);
           } catch (error) {
               console.error('Error loading contract:', error);
               setSnackbar({
                   open: true,
                   message: 'Could not establish contract connection',
                   severity: 'error'
               });
           }
       };
       initContract();
   }, []);
   ```

#### New Features:
1. In Note Cards:
   - Mint status display (e.g., "3/10 Minted")
   - "Sold Out" text when maximum mint count is reached
   - Automatic mint button disable
   - NFT ID and mint status information

2. In Detail View:
   - Mint status shown at the top
   - NFT ID information
   - Mint button disabled when sold out

3. General Improvements:
   - Contract connection status monitoring
   - Improved error messages
   - Added console.log messages for debugging
   - Numerical values converted using Number()

#### Important Notes:
1. React Hook compliant structure
2. Null checks and error handling
3. Optional chaining usage
4. Contract and wallet connection status check 