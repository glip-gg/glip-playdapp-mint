import { ethers } from "https://cdnjs.cloudflare.com/ajax/libs/ethers/5.6.9/ethers.esm.js";

checkWallet()

let isMinting = false

let walletAddress = ''
let walletBalance = 0

let minGasRequired = 0.02 //MATIC

const provider = new ethers.providers.JsonRpcProvider("https://polygon-rpc.com");

const CONTRACT_ADDRESS  = '0x77874890e357f9d3207332d905188cc012fdcd20'

let CONTRACT_ABI = [{
    "inputs": [
      {
        "internalType": "address",
        "name": "account",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "quantity",
        "type": "uint256"
      },
      {
        "internalType": "bytes32[]",
        "name": "proof",
        "type": "bytes32[]"
      }
    ],
    "name": "publicMint",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  }]


document.getElementById('claim-button').addEventListener("click",
  function(){ 
    if (isMinting) {
      
    } else {
      mint()
    }
});

async function checkWallet() {
    await window.glipWalletSDK.init({
        'clientIdentifier': '62fd0e1b5f653536e9c657a8',
        chain: 'polygon',
        authNetwork: 'cyan'
      }
    );
    if (await window.glipWalletSDK.isConnected()) {
        let walletId = await window.glipWalletSDK.getWalletID()
        let userInfo = await window.glipWalletSDK.getUserInfo();
        
        walletAddress = userInfo.publicAddress

        document.getElementById('title').innerHTML = 'Glip Wallet connected'
        document.getElementById('subtitle').innerHTML = userInfo.name

        document.getElementById('claim-button').style.visibility = 'visible'
        document.getElementById('button-description').style.visibility = 'visible'

        hideLoading()
        
        checkBalance()

    } else {
        document.getElementById('title').innerHTML = 'Wallet not found\n\nCreate your Glip Wallet from the app next time.'
        hideLoading()
    }
}

async function mint() {
    isMinting = true
    showLoading()

    if (walletBalance < minGasRequired) {
        requestBalance()
        return
    }

    document.getElementById('claim-button').innerHTML = 'Claiming NFT...'

    const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);

    let whitelistAddresses = [
        "0X5B38DA6A701C568545DCFCB03FCB875F56BEDDC4",
        "0X5A641E5FB72A2FD9137312E7694D42996D689D99",
        "0XDCAB482177A592E424D1C8318A464FC922E8DE40",
        "0X6E21D37E07A6F7E53C7ACE372CEC63D4AE4B6BD0",
        "0X09BAAB19FC77C19898140DADD30C4685C597620B",
        "0XCC4C29997177253376528C05D3DF91CF2D69061A",
        "0xdD870fA1b7C4700F2BD7f44238821C26f7392148"
      ];
    
    const leafNodes = whitelistAddresses.map(addr => keccak256(addr));
    const merkleTree = new MerkleTree(leafNodes, keccak256, { sortPairs: true});
    const rootHash = merkleTree.getRoot();

    const claimingAddress = leafNodes[6];
    const hexProof = merkleTree.getHexProof(claimingAddress);

    console.log("Root Hash: ", rootHash);
    console.log(hexProof);

    const tx = await contract.populateTransaction['publicMint'](
        walletAddress, 1, hexProof
    );

    let signer = new ethers.Wallet('8da4ef21b864d2cc526dbdb2a120bd2874c36c9d0a1fb7f8c63d7f7a8b41de8f', provider)
    // let signer = await window.glipWalletSDK.getSigner();

    let signedTransaction = await signer.signTransaction(tx);

    // let txResponse = await provider.sendTransaction(signedTransaction)

    setTimeout(function() {
        hideLoading()
        document.getElementById('claim-button').innerHTML = 'NFT Claimed!'
        checkBalance()
    }, 3000)
 
}

function requestBalance() {
    document.getElementById('claim-button').innerHTML = 'Adding balance to your wallet...'
    setTimeout(function() {
        //TODO temp
        walletBalance = 2

        checkBalance()
        mint()
    }, 2000)
}

function checkBalance() {
    provider.getBalance(walletAddress).then((balance) => {
        const balanceInEth = ethers.utils.formatEther(balance)
        console.log(`balance: ${balanceInEth} MATIC`)
        walletBalance = balanceInEth
        document.getElementById('balance').innerHTML = `Available Balance:    ${balanceInEth} MATIC` 
    })
}

function showLoading() {
    document.getElementById('loader').style.visibility = 'visible'
}

function hideLoading() {
    document.getElementById('loader').style.visibility = 'hidden'
}