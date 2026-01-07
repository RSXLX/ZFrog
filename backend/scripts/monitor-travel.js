const io = require("socket.io-client");

const SOCKET_URL = "http://localhost:3001";
const FROG_ID = 18;

console.log(`🔌 Connecting to ${SOCKET_URL}...`);
const socket = io(SOCKET_URL);

socket.on("connect", () => {
    console.log(`✅ Connected! Socket ID: ${socket.id}`);
    console.log(`📡 Subscribing to Frog #${FROG_ID}...`);
    socket.emit("subscribe:frog", FROG_ID);
});

socket.on("travel:update", (data) => {
    const timestamp = new Date().toLocaleTimeString();
    console.log(`\n[${timestamp}] 🚀 TRAVEL UPDATE:`);
    console.log(`   Stage: ${data.stage}`);
    if (data.message) {
        console.log(`   Message Type: ${data.message.type}`);
        console.log(`   Content: ${data.message.text}`);
        if (data.message.address) {
            console.log(`   Address: ${data.message.address}`);
        }
    }
});

socket.on("travel:started", (data) => {
    console.log(`\n🎉 TRAVEL STARTED! Chain: ${data.chainId}`);
});

socket.on("travel:completed", (data) => {
    console.log(`\n🏁 TRAVEL COMPLETED!`);
    console.log(`   XP Earned: ${data.xpEarned}`);
    console.log(`   Discoveries: ${data.totalDiscoveries}`);
    // Exit after completion? No, user might restart.
});

socket.on("disconnect", () => {
    console.log("❌ Disconnected");
});

console.log("Listening for events... Press Ctrl+C to stop.");
