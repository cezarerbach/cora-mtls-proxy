export default function handler(req, res) {
  return res.status(200).json({
    route: "OK",
    env: {
      certificate: !!process.env.CORA_CERTIFICATE,
      privateKey: !!process.env.CORA_PRIVATE_KEY,
      clientId: !!process.env.CORA_CLIENT_ID
    },
    sizes: {
      cert: process.env.CORA_CERTIFICATE?.length || 0,
      key: process.env.CORA_PRIVATE_KEY?.length || 0
    },
    nodeVersion: process.version
  });
}
