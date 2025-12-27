
from eth_account import Account
import json

# 创建临时账户
acct = Account.create()
print(f"Account address: {acct.address}")

tx = {
    'to': '0x0000000000000000000000000000000000000000',
    'value': 0,
    'gas': 21000,
    'gasPrice': 1000000000,
    'nonce': 0,
    'chainId': 1
}

print("Signing transaction...")
try:
    signed = acct.sign_transaction(tx)
    print(f"Signed object type: {type(signed)}")
    print(f"Signed object dir: {dir(signed)}")
    
    if hasattr(signed, 'rawTransaction'):
        print("Has rawTransaction")
    elif hasattr(signed, 'raw_transaction'):
        print("Has raw_transaction")
    else:
        print("Attribute not found")

except Exception as e:
    print(f"Error: {e}")
