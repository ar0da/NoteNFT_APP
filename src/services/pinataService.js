import axios from 'axios';

const PINATA_API_KEY = '974dc7ba82d68b9aee3e';
const PINATA_API_SECRET = '66a96ef68883fd581c35848a612d510edd841e219d3bab4354c1550997440d14';

const pinJSONToIPFS = async (JSONBody) => {
    const url = `https://api.pinata.cloud/pinning/pinJSONToIPFS`;
    
    const data = JSON.stringify({
        pinataContent: JSONBody,
        pinataOptions: {
            cidVersion: 1
        }
    });

    try {
        const response = await axios.post(url, data, {
            headers: {
                'Content-Type': 'application/json',
                'pinata_api_key': PINATA_API_KEY,
                'pinata_secret_api_key': PINATA_API_SECRET
            }
        });
        
        return response.data.IpfsHash;
    } catch (error) {
        console.error("IPFS'e yükleme hatası:", error.response ? error.response.data : error);
        throw new Error("IPFS'e yükleme başarısız: " + (error.response ? error.response.data.message : error.message));
    }
};

export const uploadToPinata = async (noteData) => {
    try {
        const metadata = {
            name: noteData.title,
            description: noteData.content,
            attributes: [
                {
                    trait_type: "Course",
                    value: noteData.course
                },
                {
                    trait_type: "Topic",
                    value: noteData.topic
                },
                {
                    trait_type: "Author",
                    value: noteData.author
                },
                {
                    trait_type: "Created",
                    value: noteData.timestamp
                }
            ]
        };

        const ipfsHash = await pinJSONToIPFS(metadata);
        return `ipfs://${ipfsHash}`;
    } catch (error) {
        console.error("Pinata yükleme hatası:", error);
        throw error;
    }
}; 