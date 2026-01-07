require("@nomicfoundation/hardhat-toolbox");
require("@openzeppelin/hardhat-upgrades");
require("dotenv").config();

module.exports = {
    solidity: {
        compilers: [
            {
                version: "0.8.20",
                settings: {
                    optimizer: { enabled: true, runs: 200 },
                    viaIR: true
                }
            },
            {
                version: "0.8.24",
                settings: {
                    optimizer: { enabled: true, runs: 200 },
                    viaIR: true
                }
            }
        ]
    },
    networks: {
        hardhat: {
            chainId: 31337,
        },
        zetaAthens: {
            // Use Blockpi as primary, env can override
            // Fallbacks if rate limited: allthatnode, drpc, itrocket
            url: process.env.ZETACHAIN_RPC_URL || "https://zetachain-athens-evm.blockpi.network/v1/rpc/public",
            chainId: 7001,
            accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
            timeout: 60000,
        },
        bscTestnet: {
            url: process.env.BSC_TESTNET_RPC_URL || "https://bsc-testnet-rpc.publicnode.com",
            chainId: 97,
            accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
            timeout: 120000,
        },

        ethSepolia: {
            url: process.env.ETH_SEPOLIA_RPC_URL || "https://ethereum-sepolia-rpc.publicnode.com",
            chainId: 11155111,
            accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
            timeout: 120000,
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
