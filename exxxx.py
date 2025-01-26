#import web3
from web3 import Web3
import requests

# Infura Configuration
infura_project_id = '115389d7c577460db52a835852e02efc'
infura_endpoint = f'https://arbitrum-mainnet.infura.io/v3/{infura_project_id}'

# Initialize Web3
web3 = Web3(Web3.HTTPProvider(infura_endpoint))
if web3.is_connected():
    print("Web3 initialized and connected to the blockchain")
else:
    raise Exception("Failed to connect to the Ethereum blockchain")

# Contract addresses
hyperliquid_contract_address = '0xC67E9Efdb8a66A4B91b1f3731C75F500130373A4'
dydx_api_endpoint = 'https://api.dydx.exchange/v3/accounts'
dydx_contract_address = '0xAC6a07aFa77aBB31C68E094AF4b496d81737Ff53'


# Function to fetch user address (simulate wallet connection)
def fetch_connected_address():
    # Simulate wallet connection; replace this with actual wallet interaction
    user_address = input("Enter your wallet address: ")
    if not Web3.is_address(user_address):
        raise ValueError("Invalid Ethereum address")
    return Web3.to_checksum_address(user_address)



# Fetch stats from Hyperliquid
def fetch_hyperliquid_stats(user_address):
    try:
        print(f"Fetching stats for Hyperliquid for user: {user_address}")

        # Correctly format topics
        logs = web3.eth.get_logs({
            'fromBlock': 'earliest',
            'toBlock': 'latest',
            'address': Web3.to_checksum_address(hyperliquid_contract_address),
            'topics': [Web3.keccak(text='Transfer(address,address,uint256)').hex()]
        })

        # Format user address for comparison
        padded_address = '0x' + user_address[2:].zfill(64).lower()

        # Filter logs for user's activity
        user_logs = [
            log for log in logs if
            log['topics'][1].hex() == padded_address or
            log['topics'][2].hex() == padded_address
        ]

        # Calculate total volume and trade count
        total_volume = sum(Web3.fromWei(int(log['data'], 16), 'ether') for log in user_logs)

        return {
            "volume": total_volume,
            "trades": len(user_logs),
        }
    except Exception as e:
        print(f"Error fetching Hyperliquid stats: {e}")
        return {"volume": 0, "trades": 0}


# Fetch stats from dYdX
def fetch_dydx_onchain_stats(user_address):
    try:
        print(f"Fetching on-chain stats for dYdX for user: {user_address}")

        logs = web3.eth.get_logs({
            'fromBlock': 'earliest',
            'toBlock': 'latest',
            'address': Web3.to_checksum_address(dydx_contract_address),
            'topics': [Web3.keccak(text='Transfer(address,address,uint256)').hex()]
        })

        # Format user address for comparison
        padded_address = '0x' + user_address[2:].zfill(64).lower()

        # Filter logs for user's activity
        user_logs = [
            log for log in logs if
            log['topics'][1].hex() == padded_address or
            log['topics'][2].hex() == padded_address
        ]

        # Calculate total volume and trade count
        total_volume = sum(Web3.fromWei(int(log['data'], 16), 'ether') for log in user_logs)

        return {
            "volume": total_volume,
            "trades": len(user_logs),
        }
    except Exception as e:
        print(f"Error fetching dYdX on-chain stats: {e}")
        return {"volume": 0, "trades": 0}


# Combine stats
def fetch_user_stats():
    """
    Fetches and combines user stats from Hyperliquid (on-chain) and dYdX (on-chain/off-chain).
    """
    try:
        # Fetch the user's wallet address
        user_address = fetch_connected_address()
        print(f"Fetching stats for user: {user_address}")

        # Fetch stats from Hyperliquid (on-chain)
        print("Fetching Hyperliquid stats...")
        hyperliquid_stats = fetch_hyperliquid_stats(user_address)

        # Fetch stats from dYdX (on-chain only, no API authentication)
        print("Fetching dYdX on-chain stats...")
        dydx_stats = fetch_dydx_onchain_stats(user_address)

        # Combine stats and return
        combined_stats = {
            "hyperliquid": hyperliquid_stats,
            "dydx": dydx_stats,
        }

        print("Combined Stats:", combined_stats)
        return combined_stats

    except Exception as e:
        # Handle errors and return empty stats
        print(f"Error fetching user stats: {e}")
        return {
            "hyperliquid": {"volume": 0, "trades": 0},
            "dydx": {"volume": 0, "trades": 0},
        }

# Display stats
def display_user_stats(stats):
    print("\nUser Stats:")
    for exchange, data in stats.items():
        print(f"{exchange.upper()}:")
        print(f"  Volume: ${data['volume']:.2f}")
        print(f"  Trades: {data['trades']}")


# Main function
if __name__ == "__main__":
    stats = fetch_user_stats()
    display_user_stats(stats)

