export interface Landmark {
    name: string;
    address: `0x${string}`;
}

export const LANDMARKS: Record<number, Landmark[]> = {
    // Ethereum
    1: [
        { name: 'Uniswap V3 Router', address: '0xE592427A0AEce92De3Edee1F18E0157C05861564' },
        { name: 'USDT Contract', address: '0xdAC17F958D2ee523a2206206994597C13D831ec7' },
        { name: 'OpenSea Registry', address: '0x7Be8076f4EA4A4AD08075C2508e481d6C946D12b' },
        { name: 'Vitalik Buterin', address: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045' },
        { name: 'Bored Ape Yacht Club', address: '0xBC4CA0EdA7647A8aB7C2061c2E118A18a936f13D' },
        { name: 'CryptoPunks', address: '0xb47e3cd837dDF8e4c57F05d70Ab865de6e193BBB' },
        { name: 'Aave V3 Pool', address: '0x87870Bca3F3f6335A32C22290987DA26f488eb0b' },
        { name: 'Curve 3Pool', address: '0xbEbc44782C7dB0a1A60Cb6fe97d0b483032FF1C7' },
    ],
    // Polygon
    137: [
        { name: 'QuickSwap Router', address: '0xa5E0829CaCEd8fFDD4De3c43696c57F7D7A678ff' },
        { name: 'Aave V3 Pool (Polygon)', address: '0x794a61358D6845594F94dc1DB02A252b5b4814aD' },
        { name: 'Lens Hub', address: '0xDb46d1Dc155634FbC732f92E853b10B288AD5a1d' },
        { name: 'OpenSea (Polygon)', address: '0x2953399124F0cBB46d2CbACD8A89cF0599974963' },
    ],
    // BSC
    56: [
        { name: 'PancakeSwap Router', address: '0x10ED43C718714eb63d5aA57B78B54704E256024E' },
        { name: 'Venus Comptroller', address: '0xfD36E2c2a6789Db23113685031d7F16329158384' },
        { name: 'Binance Hot Wallet', address: '0xF977814e90dA44bFA03b6295A0616a897441aceC' },
    ],
    // ZetaChain Athens
    7001: [
        { name: 'Zeta Connector', address: '0x239e96c8f17C85c30100AC26F635Ea15f23E9c67' },
        { name: 'Uniswap V2 Router (Zeta)', address: '0x2ca7d64A7EFE2D62A725E2B35Cf7230D6677FfEe' },
        { name: 'System Contract', address: '0x91d18e54DAf4F677CB28167158d6dd21F6aB3921' },
    ]
};
