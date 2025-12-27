
from services.wallet_manager import wallet_manager
import os

# 创建一个新的私钥用于测试
# 这是一个测试用的随机私钥，不要在生产环境使用
test_pk = '0x4c0883a69102937d6231471b5dbb6204fe5129617082792ae468d01a3f362318'

print(f"Connecting with private key...")
success, addr = wallet_manager.connect_with_private_key(test_pk)
print(f"Connect success: {success}, Address: {addr}")

if success:
    tx = {
        'to': '0x0000000000000000000000000000000000000000',
        'value': 0,
        'gas': 21000,
        'gasPrice': 1000000000,
        'nonce': 0,
        'chainId': 1
    }
    
    print("Signing transaction via wallet_manager...")
    success, result = wallet_manager.sign_transaction(tx)
    
    if success:
        print(f"Sign SUCCESS! Result (hex): {result[:10]}...")
    else:
        print(f"Sign FAILED: {result}")
else:
    print("Failed to connect wallet")
