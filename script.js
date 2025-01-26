const infuraProjectId = '115389d7c577460db52a835852e02efc';
const infuraEndpoint = `https://arbitrum-mainnet.infura.io/v3/${infuraProjectId}`;
let web3;

// Initialize Web3
if (typeof window.ethereum !== 'undefined') {
    web3 = new Web3(window.ethereum);
    console.log("Web3 initialized with MetaMask");
} else {
    alert("MetaMask is not installed. Please install it to proceed.");
}

// Contract addresses
const hyperliquidContractAddress = '0xC67E9Efdb8a66A4B91b1f3731C75F500130373A4';

// Fetch the connected user's wallet address
const fetchConnectedAddress = async () => {
    const accounts = await web3.eth.getAccounts();
    return accounts[0]; // Use the first account
};

// Fetch stats from Hyperliquid
const fetchHyperliquidStats = async (userAddress) => {
    try {
        console.log(`Fetching stats for Hyperliquid for user: ${userAddress}`);

        const logs = await web3.eth.getPastLogs({
            fromBlock: 'earliest',
            toBlock: 'latest',
            address: hyperliquidContractAddress,
            topics: [web3.utils.sha3('Transfer(address,address,uint256)')],
        });

        const userLogs = logs.filter(
            log =>
                log.topics[1] === web3.utils.padLeft(userAddress, 64) || // Sent
                log.topics[2] === web3.utils.padLeft(userAddress, 64)    // Received
        );

        let totalVolume = 0;
        userLogs.forEach(log => {
            const amount = web3.utils.fromWei(log.data, 'ether'); // Convert from Wei to Ether
            totalVolume += parseFloat(amount);
        });
        console.log("hyper: ",totalVolume)

        return {
            volume: totalVolume,
            trades: userLogs.length,
        };
    } catch (error) {
        console.error("Error fetching Hyperliquid stats:", error);
        return { volume: 0, trades: 0 };
    }
};

// Fetch stats from dYdX
const fetchDydxStats = async (userAddress) => {
    try {
        console.log(`Fetching stats for dYdX for user: ${userAddress}`);
        const response = await fetch(`https://api.dydx.exchange/v3/accounts/${userAddress}`);
        const data = await response.json();

        if (!data.accounts || data.accounts.length === 0) {
            console.log("No dYdX accounts found for this user.");
            return { volume: 0, trades: 0 };
        }

        let totalVolume = 0;
        let trades = 0;

        data.accounts.forEach(account => {
            trades += account.openPositions || 0; // Adjust as per API response structure
            totalVolume += account.collateral;   // Adjust as per API response structure
        });

        return {
            volume: totalVolume,
            trades: trades,
        };
    } catch (error) {
        console.error("Error fetching dYdX stats:", error);
        return { volume: 0, trades: 0 };
    }
};

// Combine stats from multiple sources
const fetchUserStats = async () => {
    try {
        const userAddress = await fetchConnectedAddress();
        console.log(`Fetching stats for user: ${userAddress}`);

        const hyperliquidStats = await fetchHyperliquidStats(userAddress);
        const dydxStats = await fetchDydxStats(userAddress);

        return {
            hyperliquid: hyperliquidStats,
            dydx: dydxStats,
        };
    } catch (error) {
        console.error("Error fetching user stats:", error);
        return {
            hyperliquid: { volume: 0, trades: 0 },
            dydx: { volume: 0, trades: 0 },
        };
    }
};

// Display stats dynamically
const displayUserStats = (stats) => {
    const statsContainer = document.getElementById('statsContainer');
    statsContainer.innerHTML = ''; // Clear existing stats

    for (const [exchange, data] of Object.entries(stats)) {
        const statCard = `
            <div class="glass-effect p-6">
                <h3 class="text-xl font-bold mb-4">${exchange.toUpperCase()}</h3>
                <p>Volume: $${data.volume.toLocaleString()}</p>
                <p>Trades: ${data.trades}</p>
            </div>
        `;
        statsContainer.innerHTML += statCard;
    }
};

// Connect Wallet and Fetch Stats
export const connectWallet = async () => {
    const connectButton = document.getElementById('connectWallet');
    connectButton.disabled = true; // Disable button while connecting
    connectButton.textContent = 'Connecting...';

    try {
        // Request MetaMask connection
        await window.ethereum.request({ method: 'eth_requestAccounts' });

        const userAddress = await fetchConnectedAddress();
        console.log("Connected wallet:", userAddress);

        // Update UI with wallet address
        document.getElementById('walletAddress').textContent = `Connected: ${userAddress}`;

        // Fetch and display stats
        const stats = await fetchUserStats();
        displayUserStats(stats);
    } catch (error) {
        console.error("Error connecting wallet:", error);
        alert("Failed to connect wallet. Please try again.");
    }

    connectButton.disabled = false; // Re-enable button
    connectButton.textContent = 'Connect Wallet';
};
