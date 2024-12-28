import axios from 'axios';

const PINATA_API_KEY = 'f3bc203ae698944dc124';
const PINATA_SECRET_KEY = '6bcd31c1a3be0a55c102b104f76c47d11c6ceffd30c4e74b1da6790269a35e1d';

export const uploadToPinata = async (imageBase64) => {
  try {
    // Convert Base64 to Blob
    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');
    const blob = new Blob([buffer], { type: 'image/png' });
    const file = new File([blob], 'certificate.png', { type: 'image/png' });

    // Create FormData
    const formData = new FormData();
    formData.append('file', file);

    // Add metadata
    const metadata = JSON.stringify({
      name: 'Certificate',
      keyvalues: {
        date: new Date().toISOString()
      }
    });
    formData.append('pinataMetadata', metadata);

    // Upload to Pinata
    const res = await axios.post("https://api.pinata.cloud/pinning/pinFileToIPFS", formData, {
      maxBodyLength: "Infinity",
      headers: {
        'pinata_api_key': PINATA_API_KEY,
        'pinata_secret_api_key': PINATA_SECRET_KEY
      }
    });

    console.log('Pinata response:', res.data);
    return `ipfs://${res.data.IpfsHash}`;
  } catch (error) {
    console.error('Pinata upload error:', error.response?.data || error.message);
    throw new Error('Failed to upload image to IPFS: ' + (error.response?.data?.message || error.message));
  }
}; 