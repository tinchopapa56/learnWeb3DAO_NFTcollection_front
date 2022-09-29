import { Contract, providers, utils } from "ethers";
import Head from "next/head";
import React, { useEffect, useRef, useState } from "react";
import Web3Modal from "web3modal";
import { abi, NFT_CONTRACT_ADDRESS } from "../constants";
import styles from "../styles/Home.module.css";

export default function Home() {
  const [walletConnected, setWalletConnected] = useState(false)
  const [presaleStarted, setPresaleStarted] = useState(false)
  const [presaleEnded, setpresaleEnded] = useState(false)
  const [loading, setIsLoading] = useState(false)
  const [isOwner, setIsOwner] = useState(false)
  const [tokenIdsMinted, setTokenIdsMinted] = useState("0")
  const web3ModalRef = useRef();

  const presaleMint = async () => {
    try {
      const signer = await getProviderOrSigner(true);
      const nftContract = new Contract(NFT_CONTRACT_ADDRESS, abi, signer);
      const tx = await nftContract.presaleMint({
        value: utils.parseEther("0.01"),
      });

      setIsLoading(true);
      await tx.wait();
      setIsLoading(false);
      window.alert("You successfully minted a Crypto Dev!");
    } catch (err) {
      console.error(err);
    }
  }
  const publicMint = async ()=>{
    try{
      const signer = await getProviderOrSigner(true);
      const nftContract = new Contract(NFT_CONTRACT_ADDRESS, abi, signer);
      const tx = await nftContract.mint({
        value: utils.parseEther("0.01"),
      });
      setIsLoading(true);
      await tx.wait();
      setIsLoading(false);
      window.alert("You minted a Crypto Dev!");
    } catch(err){
      console.error(err);
    }
  }
  const connectWallet = async()=>{
    try{
      await getProviderOrSigner();
      setWalletConnected(true);
    } catch(err){
      console.error(err);
    }
  }
  const startPresale = async ()=>{
    try{
      const signer = await getProviderOrSigner(true);
      const nftContract = new Contract(NFT_CONTRACT_ADDRESS, abi, signer);
      const tx = await nftContract.startPresale();
        setIsLoading(true);
        await tx.wait();
        setIsLoading(false)
      window.alert("PRESALE STARTED!")
    }catch(err){
      console.error(err);
    }
  }
  const checkIfPresaleStarted = async()=> {
    try{
      const provider = await getProviderOrSigner(true);
      const nftContract = new Contract(NFT_CONTRACT_ADDRESS, abi, provider);
      const _presaleStarted = await nftContract.presaleStarted();
      if(!_presaleStarted){
        await getOwner();
      }
      setPresaleStarted(_presaleStarted);
      return _presaleStarted
    } catch(err){
        console.error(err);
        return false;
    }
  }
  const checkIfPresaleEnded = async()=>{
    try {
      const provider = await getProviderOrSigner(true);
      const nftContract = new Contract(NFT_CONTRACT_ADDRESS, abi, provider);
      const _presaleEnded = await nftContract.presaleEnded();
      const hasEnded = _presaleEnded.lt( Math.floor(Date.now() / 1000) );
        if(hasEnded){
          setpresaleEnded(true);
        } else {
          setpresaleEnded(false);
        }
      return hasEnded;
    } catch(err){
      console.error(err);
      return false;
    }
  }
  const getOwner = async ()=>{
    try{
      const provider = await getProviderOrSigner(true);
      const nftContract = new Contract(NFT_CONTRACT_ADDRESS, abi, provider);
      const _owner =  await nftContract.owner();

      const signer = await getProviderOrSigner(true);
      const address = await signer.getAddress();
      if(address.toLowerCase() === _owner.toLowerCase()){
        setIsOwner(true);
      } 
    }catch(err){
      console.error(err.message);
    }
  }
  const getTokenIdsMinted = async () =>{
    try{
      const provider = await getProviderOrSigner(true);
      const nftContract = new Contract(NFT_CONTRACT_ADDRESS, abi, provider);
      const _tokenIds = await nftContract.tokenIds();
      setTokenIdsMinted(_tokenIds.toString());
    } catch(err){
      console.error(err);
    }
  }
  const getProviderOrSigner = async(needSigner=false) => {
    const provider = await web3ModalRef.current.connect();
    const web3Provider = new providers.Web3Provider(provider);

    const {chainId} = await web3Provider.getNetwork();
      if (chainId !== 5) {
        window.alert("Change network to Goerli");
        throw new Error("Change network to Goerli");
      }
      if(needSigner) {
        const signer = web3Provider.getSigner();
        return signer;
      }
    return web3Provider;
  }

useEffect(()=>{
  if(!walletConnected){
    web3ModalRef.current = new Web3Modal({
      network: "goerli",
      providerOptions: {},
      disableInjectedProvider: false,
    });
    connectWallet();

    const _presaleStarted = checkIfPresaleStarted();
    if(_presaleStarted){     
      checkIfPresaleEnded();    
    }

    getTokenIdsMinted();

    const presaleEndedInterval = setInterval(async function (){
      const _presaleStarted = await checkIfPresaleStarted();
      if(_presaleStarted){
        const _presaleEnded = await checkIfPresaleEnded();
        if (_presaleEnded) {
          clearInterval(presaleEndedInterval);
        }
      }
    }, 5 * 1000);

    setInterval(async function(){
      await getTokenIdsMinted();
    }, 5*1000);
  }
},[walletConnected])
    //LO Q APARECE en el boton
  const renderButton = ()=>{
    // NOT CONNECTED WALLET
    if(!walletConnected){
      return (
        <button onClick={connectWallet} className={styles.button}>
          Connect your wallet
        </button>
      );
    }
    // WAITING FOR A TX or something
    if (loading) {
      return <button className={styles.button}>Loading...</button>;
    }

    // If wallet signer is the OWNER + presale DIDNT start
    if (isOwner && !presaleStarted) {
      return (
        <button className={styles.button} onClick={startPresale}>
          Start Presale!
        </button>
      );
    }

    // REGULAR dud and presal NOT STARTED
    if (!presaleStarted) {
      return (
        <div>
          <div className={styles.description}>Presale hasnt started!</div>
        </div>
      );
    }

    // PRESALE is CURRENTLY ACTIVE = CAN MINT
    if (presaleStarted && !presaleEnded) {
      return (
        <div>
          <div className={styles.description}>
            Presale has started!!! If your address is whitelisted, Mint a Crypto
            Dev 🥳
          </div>
          <button className={styles.button} onClick={presaleMint}>
            Presale Mint 🚀
          </button>
        </div>
      );
    }

    // If presale started and has ended, its time for public minting
    if (presaleStarted && presaleEnded) {
      return (
        <button className={styles.button} onClick={publicMint}>
          Public Mint 🚀
        </button>
      );
    }
  };

  return (
    <div>
      <Head>
        <title>Crypto Devs</title>
        <meta name="description" content="Whitelist-Dapp" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <div className={styles.main}>
        <div>
          <h1 className={styles.title}>Welcome to Crypto Devs!</h1>
          <div className={styles.description}>
            Its an NFT collection for developers in Crypto.
          </div>
          <div className={styles.description}>
            {tokenIdsMinted}/20 have been minted
          </div>
          {renderButton()}
        </div>
        <div>
          <img className={styles.image} src="./cryptodevs/0.svg" />
        </div>
      </div>

      <footer className={styles.footer}>
        Made with Tincho Develps (full tutorial from Crypto Devs)
      </footer>
    </div>
  );
}