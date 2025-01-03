/* global BigInt */
import Web3 from 'web3';
import NoteNFTContract from '../contracts/NoteNFT2.json';

let web3;
let contract;
let provider;
const contractAddress = "0xfDe024484852aA774569F3a7Ce34EFC63083C644";

// ABI'yi doğrudan al
const NoteNFTAbi = Array.isArray(NoteNFTContract) ? NoteNFTContract : NoteNFTContract.abi;

const EDU_CHAIN_CONFIG = {
    chainId: '0xa045c',
    chainName: 'EDU Chain Testnet',
    nativeCurrency: {
        name: 'EDU',
        symbol: 'EDU',
        decimals: 18
    },
    rpcUrls: ['https://rpc.edu.eluv.io'],
    blockExplorerUrls: ['https://testnet.eduscan.io']
};

const DEFAULT_GAS_LIMIT = '5000000';
const BASE_GAS_PRICE = '20000000000'; // 20 Gwei
const GAS_PRICE_MULTIPLIER = 2;
const TRANSACTION_TIMEOUT = 300000;
const TRANSACTION_BLOCK_TIMEOUT = 50;
const MAX_RETRY_ATTEMPTS = 2;
const RETRY_DELAY = 3000;

const cleanupProvider = () => {
    try {
        if (provider) {
            provider.removeAllListeners();
            provider = null;
        }
        web3 = null;
        contract = null;
        console.log('Provider temizlendi');
    } catch (error) {
        console.error('Provider temizleme hatası:', error);
    }
};

const validateWeb3Environment = () => {
    if (!window.ethereum) {
        throw new Error("MetaMask bulunamadı. Lütfen MetaMask'ı yükleyin ve sayfayı yenileyin.");
    }
    
    if (typeof window.ethereum.request !== 'function') {
        throw new Error("MetaMask API'si beklendiği gibi çalışmıyor. Lütfen MetaMask'ı güncelleyin.");
    }
};

const setupProviderListeners = (provider) => {
    provider.on('accountsChanged', (accounts) => {
        console.log('Hesap değişti:', accounts);
        cleanupProvider();
    });

    provider.on('chainChanged', (chainId) => {
        console.log('Ağ değişti:', chainId);
        cleanupProvider();
    });

    provider.on('disconnect', (error) => {
        console.log('Bağlantı kesildi:', error);
        cleanupProvider();
    });

    provider.on('connect', (connectInfo) => {
        console.log('Bağlantı kuruldu:', connectInfo);
    });
};

const initializeWeb3 = async () => {
    try {
        validateWeb3Environment();

        if (provider) {
            cleanupProvider();
        }

        provider = window.ethereum;
        setupProviderListeners(provider);

        web3 = new Web3(provider);
        
        // Contract başlatma
        try {
            if (!NoteNFTAbi || !Array.isArray(NoteNFTAbi)) {
                console.error('ABI Yapısı:', NoteNFTAbi);
                throw new Error("Geçerli bir kontrat ABI'si bulunamadı");
            }

            contract = new web3.eth.Contract(NoteNFTAbi, contractAddress);
            
            // Kontrat bağlantısını test et
            await contract.methods.name().call();
            
            console.log('Web3 ve kontrat başarıyla başlatıldı');
            return true;
        } catch (error) {
            console.error("Kontrat başlatma hatası:", error);
            cleanupProvider();
            throw new Error("Kontrat başlatılamadı: " + (error.message || 'Bilinmeyen hata'));
        }
    } catch (error) {
        console.error("Web3 başlatma hatası:", error);
        cleanupProvider();
        throw error;
    }
};

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const retryOperation = async (operation, retryCount = 0) => {
    try {
        return await operation();
    } catch (error) {
        if (retryCount < MAX_RETRY_ATTEMPTS) {
            await sleep(RETRY_DELAY);
            return retryOperation(operation, retryCount + 1);
        }
        throw error;
    }
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
                throw new Error('EDU Chain ağı eklenemedi: ' + addError.message);
            }
        } else {
            throw new Error('Ağ değiştirilemedi: ' + switchError.message);
        }
    }
};

export const initWeb3 = async () => {
    if (window.ethereum) {
        try {
            await initializeWeb3();
            await window.ethereum.request({ method: 'eth_requestAccounts' });
            await switchToEduChain();
            return true;
        } catch (error) {
            console.error("Kullanıcı erişimi reddetti veya ağ değiştirilemedi:", error);
            return false;
        }
    }
    return false;
};

export const connectWallet = async () => {
    try {
        if (!web3) {
            const initialized = await initWeb3();
            if (!initialized) {
                return { success: false, error: "Web3 başlatılamadı" };
            }
        }

        await switchToEduChain();
        const accounts = await web3.eth.getAccounts();
        
        if (accounts.length === 0) {
            return { success: false, error: "Cüzdan bağlanamadı" };
        }

        return { success: true, address: accounts[0] };
    } catch (error) {
        console.error("Cüzdan bağlantı hatası:", error);
        return { success: false, error: error.message };
    }
};

const formatError = (error) => {
    console.error('Ham hata:', error);
    console.error('Hata stack:', error.stack);
    console.error('Hata detayları:', JSON.stringify(error, Object.getOwnPropertyNames(error)));
    
    if (typeof error === 'object' && error !== null) {
        if (error.code === 4001) {
            return new Error('İşlem kullanıcı tarafından reddedildi');
        }
        
        if (error.message) {
            if (error.message.includes('Internal JSON-RPC error')) {
                return new Error(
                    'Ağ bağlantısı hatası. Lütfen şu adımları deneyin:\n' +
                    '1. MetaMask\'ı kapatıp açın\n' +
                    '2. Sayfayı yenileyin\n' +
                    '3. EDU Chain ağına bağlı olduğunuzdan emin olun\n' +
                    '4. Cüzdanınızda yeterli EDU token olduğundan emin olun'
                );
            }
            
            if (error.message.includes('insufficient funds')) {
                return new Error('Yetersiz bakiye: İşlem için yeterli EDU token\'ınız yok');
            }

            if (error.message.includes('nonce too low')) {
                return new Error('İşlem sırası hatası: Lütfen sayfayı yenileyip tekrar deneyin');
            }

            return new Error(`İşlem hatası: ${error.message}`);
        }
        
        if (error.toString) {
            return new Error(`İşlem hatası: ${error.toString()}`);
        }
    }
    
    return new Error('Bilinmeyen bir hata oluştu');
};

export const getContract = async () => {
    if (!web3 || !contract) {
        await initializeWeb3();
    }
    return contract;
};

export const createNote = async (tokenURI, contentHash, maxSupply, price, account) => {
    try {
        if (!tokenURI || !contentHash || !account || !maxSupply || !price) {
            throw new Error('Gerekli parametreler eksik: tokenURI, contentHash, maxSupply, price ve account gerekli');
        }

        // Web3 ve contract kontrolü
        if (!web3 || !contract) {
            await initializeWeb3();
        }

        // Ağ kontrolü
        const chainId = await web3.eth.getChainId();
        if (chainId.toString(16) !== EDU_CHAIN_CONFIG.chainId.replace('0x', '')) {
            await switchToEduChain();
            await new Promise(resolve => setTimeout(resolve, 1000));
        }

        // Hesap kontrolü
        const accounts = await web3.eth.getAccounts();
        if (!accounts.includes(account)) {
            throw new Error('Lütfen MetaMask hesabınızı kontrol edin');
        }

        console.log('createNote parametreleri:', {
            tokenURI,
            contentHash,
            maxSupply,
            price,
            account,
            chainId: chainId.toString(16)
        });

        // BigInt kullanarak gas hesaplaması
        const gasPrice = await web3.eth.getGasPrice();
        const gasPriceBigInt = BigInt(gasPrice);
        const adjustedGasPrice = (gasPriceBigInt * BigInt(150) / BigInt(100)).toString(); // %50 artış

        // İşlem parametreleri
        const transactionParameters = {
            from: account,
            gas: '8000000',
            gasPrice: adjustedGasPrice
        };

        console.log('İşlem parametreleri:', transactionParameters);

        try {
            // Önce gas tahminini deneyelim
            const gasEstimate = await contract.methods.createNote(tokenURI, contentHash, maxSupply, price)
                .estimateGas({ from: account });
            
            console.log('Tahmini gas:', gasEstimate);
            
            // Gas limitini tahmine göre ayarla (BigInt kullanarak)
            const gasEstimateBigInt = BigInt(gasEstimate);
            const adjustedGas = (gasEstimateBigInt * BigInt(150) / BigInt(100)).toString(); // %50 artış
            transactionParameters.gas = adjustedGas;
        } catch (gasError) {
            console.warn('Gas tahmini yapılamadı, varsayılan değer kullanılacak:', gasError);
        }

        // İşlemi gönder
        const result = await contract.methods.createNote(tokenURI, contentHash, maxSupply, price)
            .send(transactionParameters);

        console.log('İşlem sonucu:', result);

        if (!result || !result.events || !result.events.NoteCreated) {
            console.error('Event bulunamadı:', result);
            throw new Error('Note oluşturma işlemi başarısız oldu: Event bulunamadı');
        }

        return result;
    } catch (error) {
        console.error('Not oluşturma detaylı hata:', {
            error: error,
            message: error.message,
            code: error.code,
            data: error.data,
            stack: error.stack
        });
        
        if (typeof error === 'object' && error !== null) {
            if (error.message) {
                if (error.message.includes('insufficient funds')) {
                    throw new Error('Yetersiz bakiye: İşlem için yeterli EDU token\'ınız yok');
                }
                
                if (error.message.includes('gas required exceeds allowance')) {
                    throw new Error('Gas limiti aşıldı: Lütfen daha düşük değerler deneyin');
                }
                
                if (error.message.includes('execution reverted')) {
                    throw new Error('İşlem geri alındı: ' + (error.reason || error.data || 'Kontrat hatası'));
                }

                if (error.message.includes('transaction underpriced')) {
                    throw new Error('İşlem fiyatı çok düşük: Lütfen gas fiyatını artırın');
                }

                throw new Error('İşlem hatası: ' + error.message);
            }

            if (error.code) {
                throw new Error('İşlem kodu hatası: ' + error.code);
            }
        }
        
        throw new Error('Bilinmeyen bir hata oluştu. Lütfen console\'u kontrol edin.');
    }
};

export const mintNote = async (tokenId, account) => {
    try {
        if (!tokenId || !account) {
            throw new Error('Gerekli parametreler eksik: tokenId ve account gerekli');
        }

        // Web3 ve contract kontrolü
        if (!web3 || !contract) {
            console.log('Web3 veya kontrat başlatılıyor...');
            await initializeWeb3();
        }

        // Kontrat bağlantısını detaylı kontrol
        if (!contract || !contract.methods) {
            console.error('Kontrat bağlantısı yok veya geçersiz');
            throw new Error('Kontrat bağlantısı kurulamadı');
        }

        // Kontrat metodlarını kontrol et
        console.log('Kontrat metodları:', Object.keys(contract.methods));
        
        // Ağ kontrolü
        const chainId = await web3.eth.getChainId();
        console.log('Mevcut Chain ID:', chainId);
        const expectedChainId = EDU_CHAIN_CONFIG.chainId.replace('0x', '');
        console.log('Beklenen Chain ID:', expectedChainId);
        
        if (chainId.toString(16) !== expectedChainId) {
            console.log('Ağ değişikliği gerekiyor...');
            await switchToEduChain();
            await new Promise(resolve => setTimeout(resolve, 2000));
        }

        // Not detaylarını al
        console.log('Not detayları alınıyor... TokenId:', tokenId);
        let noteDetails;
        try {
            // Önce kontrat adresini kontrol et
            console.log('Kontrat adresi:', contract.options.address);
            
            // getNoteDetails metodunu kontrol et
            const getNoteDetailsMethod = contract.methods.getNoteDetails(tokenId);
            if (!getNoteDetailsMethod) {
                throw new Error('getNoteDetails metodu bulunamadı');
            }
            
            // Metod çağrısını yap
            noteDetails = await getNoteDetailsMethod.call({ from: account });
            
            if (!noteDetails) {
                throw new Error('Not detayları boş döndü');
            }
            console.log('Not detayları başarıyla alındı:', JSON.stringify(noteDetails, null, 2));
        } catch (detailsError) {
            console.error('Not detayları alınırken hata:', {
                error: detailsError,
                message: detailsError.message,
                code: detailsError.code,
                data: detailsError.data
            });
            throw new Error(`Not detayları alınamadı: ${detailsError.message || 'Kontrat çağrısı başarısız'}`);
        }

        const price = noteDetails.price;
        if (!price) {
            throw new Error('Not fiyatı bulunamadı');
        }

        // Kontrat durumunu kontrol et
        try {
            const isActive = noteDetails.isActive;
            if (!isActive) {
                throw new Error('Bu not artık aktif değil');
            }

            const currentSupply = noteDetails.currentSupply;
            const maxSupply = noteDetails.maxSupply;
            
            if (currentSupply >= maxSupply) {
                throw new Error('Bu not için maksimum mint sayısına ulaşıldı');
            }
        } catch (stateError) {
            console.error('Kontrat durum kontrolü hatası:', stateError);
            throw new Error('Kontrat durum kontrolü başarısız: ' + (stateError.message || 'Bilinmeyen hata'));
        }

        console.log('Mint işlemi detayları:', {
            tokenId,
            account,
            price: price.toString(),
            noteDetails
        });

        // İşlem parametrelerini hazırla
        const gasPrice = await web3.eth.getGasPrice();
        const adjustedGasPrice = Math.ceil(Number(gasPrice) * 1.1).toString(); // %10 artış

        const mintParams = {
            from: account,
            value: price.toString(),
            gas: DEFAULT_GAS_LIMIT,
            gasPrice: adjustedGasPrice,
            maxFeePerGas: null, // EIP-1559 için
            maxPriorityFeePerGas: null // EIP-1559 için
        };

        // Gas tahminini dene
        try {
            const gasEstimate = await contract.methods.mintNote(tokenId)
                .estimateGas({
                    from: account,
                    value: price.toString()
                });

            // Gas limitini %20 artır
            mintParams.gas = Math.ceil(gasEstimate * 1.2).toString();
            console.log('Gas tahmini başarılı:', gasEstimate);
        } catch (gasError) {
            console.error('Gas tahmini hatası:', gasError);
            // Varsayılan gas limitini %50 artır
            mintParams.gas = Math.ceil(Number(DEFAULT_GAS_LIMIT) * 1.5).toString();
            console.log('Artırılmış varsayılan gas limiti kullanılacak:', mintParams.gas);
        }

        // İşlemi gönder
        console.log('Mint işlemi başlatılıyor...', mintParams);
        const result = await contract.methods.mintNote(tokenId)
            .send(mintParams);

        console.log('Mint işlemi sonucu:', result);
        return { success: true, transaction: result };
    } catch (error) {
        console.error('NFT mint hatası:', error);
        
        // Hata detaylarını logla
        console.error('Hata detayları:', {
            error: error,
            type: typeof error,
            message: error?.message,
            code: error?.code,
            reason: error?.reason,
            data: error?.data
        });

        // Web3 hata objesi kontrolü
        if (error.code) {
            switch (error.code) {
                case 4001:
                    throw new Error('İşlem kullanıcı tarafından reddedildi');
                case -32603:
                    if (error.data?.message?.includes('insufficient funds')) {
                        throw new Error('Yetersiz bakiye: İşlem için yeterli EDU token\'ınız yok');
                    }
                    if (error.data?.message?.includes('Max supply reached')) {
                        throw new Error('Bu not için maksimum mint sayısına ulaşıldı');
                    }
                    throw new Error('İşlem başarısız: ' + (error.data?.message || error.message || 'Bilinmeyen hata'));
                default:
                    throw new Error('İşlem hatası: ' + (error.message || JSON.stringify(error)));
            }
        }

        // Normal hata mesajı kontrolü
        const errorMessage = error?.message || (typeof error === 'string' ? error : JSON.stringify(error));
        
        if (errorMessage.includes('insufficient funds')) {
            throw new Error('Yetersiz bakiye: İşlem için yeterli EDU token\'ınız yok');
        } 
        if (errorMessage.includes('User denied') || errorMessage.includes('user rejected')) {
            throw new Error('İşlem kullanıcı tarafından reddedildi');
        } 
        if (errorMessage.includes('Max supply reached')) {
            throw new Error('Bu not için maksimum mint sayısına ulaşıldı');
        }
        if (errorMessage.includes('execution reverted')) {
            throw new Error('İşlem geri alındı: ' + errorMessage);
        }
        if (errorMessage.includes('nonce too low')) {
            throw new Error('İşlem sırası hatası: Lütfen sayfayı yenileyip tekrar deneyin');
        }
        
        // Genel hata durumu
        throw new Error('Mint işlemi başarısız: ' + (typeof error === 'object' ? JSON.stringify(error) : errorMessage));
    }
};

export const hasNoteAccess = async (tokenId, account) => {
    try {
        // Smart contract'taki hasNoteAccess fonksiyonunu çağır
        const hasAccess = await contract.methods.hasNoteAccess(tokenId, account).call();
        return hasAccess;
    } catch (error) {
        console.error('Not erişim kontrolü hatası:', error);
        return false;
    }
};

export const getNoteDetails = async (tokenId) => {
    try {
        const result = await contract.methods.getNoteDetails(tokenId).call();
        return {
            author: result.author,
            isActive: result.isActive
        };
    } catch (error) {
        console.error("Error getting note details:", error);
        throw error;
    }
};

export const toggleNoteActive = async (tokenId, account) => {
    try {
        const result = await contract.methods.toggleNoteActive(tokenId)
            .send({ from: account });
        return result;
    } catch (error) {
        console.error("Error toggling note status:", error);
        throw error;
    }
};

export const updateNotePrice = async (tokenId, newPrice, account) => {
    try {
        if (!tokenId || !newPrice || !account) {
            throw new Error('Gerekli parametreler eksik: tokenId, newPrice ve account gerekli');
        }

        // Web3 ve contract kontrolü
        if (!web3 || !contract) {
            await initializeWeb3();
        }

        // Gas tahminini yap
        const gasEstimate = await contract.methods.updateNotePrice(tokenId, newPrice)
            .estimateGas({ from: account });

        // Gas hesaplamaları
        const gasLimit = Math.min(Math.ceil(Number(gasEstimate) * 1.1), 3000000);
        const currentGasPrice = await web3.eth.getGasPrice();
        const gasPrice = Math.max(
            Math.floor(Number(currentGasPrice) * 1.2),
            Number(BASE_GAS_PRICE)
        ).toString();

        // İşlemi gönder
        const result = await contract.methods.updateNotePrice(tokenId, newPrice)
            .send({
                from: account,
                gas: gasLimit,
                gasPrice: gasPrice
            });

        return { success: true, transaction: result };
    } catch (error) {
        console.error('Fiyat güncelleme hatası:', error);
        throw formatError(error);
    }
}; 