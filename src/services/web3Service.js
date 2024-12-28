import { ethers } from 'ethers';
import detectEthereumProvider from '@metamask/detect-provider';
import { uploadToPinata } from './pinataService';

const NFT_CONTRACT_ADDRESS = "0x70a97A50931986b6853A88fA67970727E1BAfb46";

const EDU_CHAIN_CONFIG = {
  chainId: '0xa045c', // 656476 (0xa045c)
  chainName: 'EDU Chain Testnet',
  nativeCurrency: {
    name: 'EDU',
    symbol: 'EDU',
    decimals: 18
  },
  rpcUrls: ['https://rpc.edu.eluv.io'],
  blockExplorerUrls: ['https://testnet.eduscan.io']
};

const switchToEduChain = async () => {
  try {
    await window.ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: EDU_CHAIN_CONFIG.chainId }],
    });
  } catch (switchError) {
    if (switchError.code === 4902) {
      try {
        await window.ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [EDU_CHAIN_CONFIG],
        });
      } catch (addError) {
        throw new Error('Failed to add EDU Chain network: ' + addError.message);
      }
    } else {
      throw new Error('Failed to switch network: ' + switchError.message);
    }
  }
};

export const connectWallet = async () => {
  try {
    const provider = await detectEthereumProvider();
    
    if (provider) {
      await provider.request({ method: 'eth_requestAccounts' });
      await switchToEduChain();
      
      const ethersProvider = new ethers.BrowserProvider(window.ethereum);
      const signer = await ethersProvider.getSigner();
      const address = await signer.getAddress();

      const network = await ethersProvider.getNetwork();
      if (network.chainId !== 656476n) {
        throw new Error('Please switch to EDU Chain Testnet!');
      }

      return { success: true, address };
    } else {
      throw new Error("MetaMask is not installed!");
    }
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const mintNoteAsNFT = async (noteData, imageBase64) => {
  try {
    const provider = await detectEthereumProvider();
    
    if (!provider) {
      throw new Error("MetaMask is not installed!");
    }

    const ethersProvider = new ethers.BrowserProvider(window.ethereum, {
      name: 'EDU Chain Testnet',
      chainId: 656476
    });
    
    const network = await ethersProvider.getNetwork();
    if (network.chainId !== 656476n) {
      await switchToEduChain();
    }

    // Upload image to Pinata
    const tokenURI = await uploadToPinata(imageBase64);
    console.log('Pinata URI:', tokenURI);

    const signer = await ethersProvider.getSigner();

    // Interact with NFT contract
    const contract = new ethers.Contract(
      NFT_CONTRACT_ADDRESS,
      ["function mintNote(address recipient, string memory tokenURI) public returns (uint256)"],
      signer
    );

    // Mint NFT using Pinata URI
    const tx = await contract.mintNote(await signer.getAddress(), tokenURI);
    await tx.wait();

    return { 
      success: true, 
      transaction: tx,
      tokenURI: tokenURI,
      explorerUrl: `${EDU_CHAIN_CONFIG.blockExplorerUrls[0]}/tx/${tx.hash}`
    };
  } catch (error) {
    console.error('Mint error:', error);
    return { success: false, error: error.message };
  }
}; 