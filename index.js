import { ethers } from "https://cdnjs.cloudflare.com/ajax/libs/ethers/5.6.9/ethers.esm.js";

let isMinting = false

let walletAddress = ''
let walletId = ''

let mintStartTime = 1662418800

let walletBalance = 0

let minGasRequired = 0.01 //MATIC

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


checkWallet()
checkAction()

async function checkAction() {
    const params = new Proxy(new URLSearchParams(window.location.search), {
        get: (searchParams, prop) => searchParams.get(prop),
      });
    
    let action = params.action;
    
    if (action == 'approve') {
        approveTransaction(params.signedTransaction)
        return
    }

    if (action == 'reject') {
        rejectTransaction()
        return
    }
}

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
        walletId = await window.glipWalletSDK.getWalletID()
        let userInfo = await window.glipWalletSDK.getUserInfo();
        
        console.log('walletId', walletId)

        walletAddress = userInfo.publicAddress

        // if (!(whitelistAddresses.map((x) => x.toLowerCase()).includes(walletAddress.toLowerCase()))) {
        //     document.getElementById('title').innerHTML = `You didn't register to claim NFT<br>Keep an eye on next reward in Glip app`
        //     hideLoading()
        //     return
        // }

        document.getElementById('title').innerHTML = 'Glip Wallet connected'
        document.getElementById('subtitle').innerHTML = userInfo.name

        document.getElementById('claim-button').style.visibility = 'visible'
        document.getElementById('button-description').style.visibility = 'visible'

        hideLoading()
        
        if (Date.now() / 1000 < mintStartTime) {
            document.getElementById('claim-button').innerHTML = 'Claim not yet started'
        }

        checkBalance()

    } else {
        document.getElementById('title').innerHTML = 'Wallet not found<br>You missed your free NFT. Create your Glip Wallet from the app and keep an eye on next reward.'
        hideLoading()
    }
}

function enoughBalance() {
    return walletBalance >= minGasRequired
}

async function mint() {
    if (Date.now() / 1000 < mintStartTime) {
        return
    }

    isMinting = true
    showLoading()

    if (!enoughBalance()) {
        requestBalance()
        return
    }

    document.getElementById('claim-button').innerHTML = 'Claiming NFT...'

    const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);
    
    const leafNodes = whitelistAddresses.map(addr => keccak256(addr));
    const merkleTree = new MerkleTree(leafNodes, keccak256, { sortPairs: true});
    const rootHash = merkleTree.getRoot();

    const claimingAddress = leafNodes[0];
    const hexProof = merkleTree.getHexProof(claimingAddress);

    console.log("Root Hash: ", rootHash);
    console.log(hexProof);

    const tx = await contract.populateTransaction['publicMint'](
        walletAddress, 1, hexProof
    );

    let signer = await window.glipWalletSDK.getSigner();
    await signer.signTransaction(tx);
 
}

function requestBalance() {
    console.log('requesting balance')

    document.getElementById('claim-button').innerHTML = 'Adding balance to your wallet...'

    const options = {method: 'POST', headers: {Accept: 'application/json'}};

    fetch(`https://be.namasteapis.com/blockchain/v1/glip/wallet/fund?walletId=${walletId}`, options)
    .then(response => response.json())
    .then(response => {
        console.log(response)
        verifyBalanceChangeAndMint()
        }
    )
    .catch(err => console.error(err));
  

}

function verifyBalanceChangeAndMint() {
    setTimeout(function() {
        console.log('checking balance increase')
        checkBalance(function() {
            if (enoughBalance()) {
                mint()
            } else {
                verifyBalanceChangeAndMint()
            }
        })
        
    }, 4000)
}

function checkBalance(callback) {
    provider.getBalance(walletAddress).then((balance) => {
        const balanceInEth = ethers.utils.formatEther(balance)
        console.log(`balance: ${balanceInEth} MATIC`)
        walletBalance = balanceInEth
        document.getElementById('balance').innerHTML = `Available Balance:    ${balanceInEth} MATIC` 

        if (callback) {
            callback()
        }
    })
}

async function approveTransaction(signedTx) {
    console.log('tx approved')

    console.log(signedTx)

    document.getElementById('claim-button').innerHTML = 'Claiming NFT...'
    showLoading()

    let txResponse = await provider.sendTransaction(signedTx)
    await txResponse.wait()

    hideLoading()
    document.getElementById('claim-button').innerHTML = 'NFT Claimed!'
    checkBalance()
}

async function rejectTransaction() {
    console.log('tx rejected')
    document.getElementById('claim-button').innerHTML = 'Transaction rejected. Try again'
    hideLoading()
    isMinting = false
}

function showLoading() {
    document.getElementById('loader').style.visibility = 'visible'
}

function hideLoading() {
    document.getElementById('loader').style.visibility = 'hidden'
}

let whitelistAddresses = ['0x9bf19a87b973ebf02f0c6c1e5d01ebdb099295b7', '0x697530603b985817C9d81154eC3eE0384123feA1']