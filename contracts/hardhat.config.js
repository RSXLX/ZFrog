require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

module.exports = {
    solidity: {
        version: "0.8.20",
        settings: {
            optimizer: {
                enabled: true,
                runs: 200,
            },
        },
    },
    networks: {
        hardhat: {
            chainId: 31337,
        },
        zetaAthens: {
            url: process.env.ZETACHAIN_RPC_URL || "https://zetachain-athens.blockpi.network/v1/rpc/public",
            chainId: 7001,
            accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
        },
    },
    etherscan: {
        apiKey: {
            zetaAthens: process.env.ZETASCAN_API_KEY || "placeholder",
        },
        customChains: [
            {
                network: "zetaAthens",
                chainId: 7001,
                urls: {
                    apiURL: "https://athens.explorer.zetachain.com/api",
                    browserURL: "https://athens.explorer.zetachain.com",
                },
            },
        ],
    },
};
