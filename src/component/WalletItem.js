import { useState, useEffect } from 'react';
import {ethers} from 'ethers';
import LoadingIcon from './LoadingIcon';
import ethIcon from '../images/svg/ETH-circle-icon.svg';
import NotificationManager from 'react-notifications/lib/NotificationManager';
const wethAddy = process.env.REACT_APP_NETWORK == "mainnet" ? "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2": "0xc778417e063141139fce010982780140aa0cd5ab";
const provider = new ethers.providers.JsonRpcProvider(`https://${process.env.REACT_APP_NETWORK}.infura.io/v3/1c8b15f18bcf4477810d7d44980d2413`);
const routerAddy = "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D";

export default function WalletItem({idx, setting, accounts, tokens, onDelClick, onChangeSetting, clock, routerContract, addTransaction, ethPrice, socketNum, pendings}) {
  const [walletAddy, setWalletAddy] = useState("");
  const [tokenAddy, setTokenAddy] = useState("");
  const [percent, setPercent] = useState(100);
  const [loading, setLoading] = useState(false);
  const [receiveEth, setReceiveEth] = useState(0);
  const [tokenAmount, setTokenAmount] = useState(0);
  const [symbol, setSymbol] = useState("Tokens");
  const [decimals, setDecimals] = useState("");
  const [allowance, setAllowance] = useState("0");

  const [approveLoading, setApproveLoading] = useState(false);
  const [sellLoading, setSellLoading] = useState(false);
  const [speedupLoading, setSpeedupLoading] = useState(false);

  useEffect(() => {
    setWalletAddy(setting.walletAddy);
    setTokenAddy(setting.tokenAddy);
    setPercent(setting.percent);
  }, []);

  useEffect(() => {
    onChangeSetting(idx, {
      walletAddy, tokenAddy, percent
    })
  }, [walletAddy, tokenAddy, percent]);

  useEffect(() => {
    if(walletAddy && tokenAddy)
    tokens.map(token => {
      if(token.address == tokenAddy) {
        setSymbol(token.symbol);
        setDecimals(token.decimals);
        
        const tokenContract = new ethers.Contract(tokenAddy, [
          'function allowance(address owner, address spender) public view returns (uint)',
          'function balanceOf(address account) external view returns (uint256)'
        ], provider);
        tokenContract.allowance(walletAddy, routerAddy).then(value => {
          setAllowance(value + '');
        })
        tokenContract.balanceOf(walletAddy).then(value => {
          setTokenAmount(ethers.utils.formatUnits(value, token.decimals));
        })
      }
    })
  }, [walletAddy, tokenAddy]);

  const onPercentUp = (percent) => {
    //console.log(idx, tokenAddy, tokenAmount, decimals, percent);
    if(tokenAmount && tokenAddy) {
      //console.log(tokenAmount);
      const amountIn = ethers.utils.parseUnits(tokenAmount, decimals).mul(percent).div(100);        
      const path = [tokenAddy, wethAddy];
      if(amountIn.gt(0)) {
        setLoading(true);
        routerContract.getAmountsOut(amountIn, path).then(amounts => {
          const receiveAmount = ethers.utils.formatEther(amounts[1]);
          setReceiveEth(receiveAmount * 1);
        }).finally(() => {
          setLoading(false);
        })
      } else {
        setReceiveEth(0);
      }
    }
  } 

  useEffect(() => {
    onPercentUp(percent);
  }, [clock, symbol, tokenAmount]);
  

  const onApproveClick = () => {
    try {
      const requestOption = {
        method: "POST",
        body: JSON.stringify({
          tokenAddy, walletAddy
        }),
        headers: {
          "Content-type": "application/json"
        }
      }
      setApproveLoading(true);
      fetch(process.env.REACT_APP_BACKEND_API + "/approve", requestOption).then(res => {
        if(res.status == 200) {
          setApproveLoading(false);
          NotificationManager.success("Success");
        }
        else {
          res.json().then(r => {
            setApproveLoading(false);
            NotificationManager.error(r.message);
          })
        }
      }).catch((err) => {
        setApproveLoading(false);
        NotificationManager.error(err.message);
      });
    } catch(err) {
      NotificationManager.error(err.message);
    }
  }

  const onSellClick = () => {
    try {
      const { gasMaxFee, gasLimit, maxPriorityFee, slippage} = localStorage.getItem("gasDetails") ? JSON.parse(localStorage.getItem("gasDetails")): {};
      if(!gasMaxFee || !gasLimit || !maxPriorityFee || !slippage) { NotificationManager.warning("gas Info not correct"); return; }
      
      if (!tokenAmount || !decimals) {
        NotificationManager.warning("Token amount is invalid");
        return;
      }
      const requestOption = {
        method: "POST",
        body: JSON.stringify({
          tokenAddy, walletAddy, amountIn: ethers.utils.parseUnits(tokenAmount, decimals).mul(percent).div(100) + '', maxFeePerGas: gasMaxFee, maxPriorityFeePerGas : maxPriorityFee, limit : gasLimit, slippage, socketNum, idx
        }),
        headers: {
          "Content-type": "application/json"
        }
      }
      setSellLoading(true);
      fetch(process.env.REACT_APP_BACKEND_API + "/sell", requestOption).then(res => {
        if(res.status == 200) {
          res.json().then(r => {
            addTransaction(r);
            if(r.tokenAddy == tokenAddy) {
              //console.log(ethers.utils.formatUnits(ethers.utils.parseUnits(tokenAmount, decimals).sub(ethers.BigNumber.from(r.amountIn)), decimals));
              setTokenAmount(ethers.utils.formatUnits(ethers.utils.parseUnits(tokenAmount, decimals).sub(ethers.BigNumber.from(r.amountIn)), decimals));
            }
            setSellLoading(false);
            const {transactionHash: hash} = r;
            NotificationManager.success(<a href={`https://ropsten.etherscan.io/tx/${hash}`} target="_blank">{hash.substr(0,14) + '...' + hash.substr(-10)}</a>,"Success", 10000);
          })
        }
        else {
          res.json().then(r => {
            NotificationManager.error(r.message);
          })
        }
      }).catch((err) => {
        NotificationManager.error(err.message);
        setSellLoading(false);
      });
    } catch(err) {
      console.log(err);
      NotificationManager.error(err.message);
    }
  }

  const onSpeedClick = (hash) => {
    try {
      const { gasMaxFee, gasLimit, maxPriorityFee, slippage} = localStorage.getItem("gasDetails") ? JSON.parse(localStorage.getItem("gasDetails")): {};
      if(!gasMaxFee || !gasLimit || !maxPriorityFee || !slippage) { NotificationManager.warning("gas Info not correct"); return; }
      
      const requestOption = {
        method: "POST",
        body: JSON.stringify({
          tokenAddy, maxFeePerGas: gasMaxFee, maxPriorityFeePerGas : maxPriorityFee, limit : gasLimit, slippage, socketNum, idx, hash
        }),
        headers: {
          "Content-type": "application/json"
        }
      }
      setSpeedupLoading(true);
      fetch(process.env.REACT_APP_BACKEND_API + "/speedup", requestOption).then(res => {
        setSpeedupLoading(false);
        if(res.status == 200) {
          res.json().then(r => {
            addTransaction(r);
            if(r.tokenAddy == tokenAddy) {
              //console.log(ethers.utils.formatUnits(ethers.utils.parseUnits(tokenAmount, decimals).sub(ethers.BigNumber.from(r.amountIn)), decimals));
              setTokenAmount(ethers.utils.formatUnits(ethers.utils.parseUnits(tokenAmount, decimals).sub(ethers.BigNumber.from(r.amountIn)), decimals));
            }
            setSellLoading(false);
            const {transactionHash: hash} = r;
            NotificationManager.success(<a href={`https://${process.env.REACT_APP_NETWORK == "ropsten" ? "ropsten.": ""}etherscan.io/tx/${hash}`} target="_blank">{hash.substr(0,14) + '...' + hash.substr(-10)}</a>,"Success", 10000);
          })
        }
        else {
          res.json().then(r => {
            NotificationManager.error(r.message);
          })
        }

      }).catch((err) => {
        setSpeedupLoading(false);
        NotificationManager.error(err.message);
        setSellLoading(false);
      });
    } catch(err) {
      setSpeedupLoading(false);
      console.log(err);
      NotificationManager.error(err.message);
    }
  }

    return (
        <div className="wallet--panel-block" data-aos="fade-up">
            <div className="wallet--delete-button" title="Delete Panel" onClick={() => onDelClick(idx)}>
                <a href="#"><i className="fas fa-times"></i></a>
            </div>
            <h5>Wallet Name #{idx + 1}</h5>
            <div className="wallet--input-group">
                <select
                    className="form-select"
                    aria-label="Default select wallet"
                    value={walletAddy}
                    onChange={(event) => {setWalletAddy(event.target.value)}}
                >
                    <option value="">Wallet</option>
                    {accounts.map((account, account_idx) => {
                        return <option key={account_idx} value={account.address}>{account.name}</option>
                    })}
                </select>
            </div>
            <div className="wallet--input-group">
                <select
                    className="form-select"
                    aria-label="Default select token"
                    value={tokenAddy}
                    onChange={(event) => {setTokenAddy(event.target.value)}}
                >
                    <option value="">Token</option>
                    {
                        tokens.map((token, token_idx) => {
                          return <option key={token_idx} value={token.address}>{token.name}({token.symbol})</option>
                        })
                    }
                </select>
            </div>

            <div className="wallet--token-amount-group">
                <div className="amount-price-ethereum">
                  {loading ? <LoadingIcon style={{marginRight: '5px'}} /> : <img src={ethIcon} />}<h6>{receiveEth.toFixed(6)}(${(receiveEth*ethPrice).toFixed(1)})</h6>
                </div>
                <input
                    type="range"
                    className="customrange"
                    min="0"
                    max="100"
                    step="1"
                    value={percent}
                    style={{background: 'linear-gradient(to right, #3c3e42 0%, #3c3e42 ' + percent + '%, #1a1a1e ' + percent + '%, #1a1a1e ' + percent + '%)'}}
                    onChange={(event) => setPercent(event.target.value)}
                    onMouseUp={() => onPercentUp(percent)}
                />
                <div className="amount-token-flex">
                    <p className="token-amount">{(tokenAmount * percent / 100).toFixed(3)} {symbol}</p>
                    <p>{percent}%</p>
                </div>
            </div>
            <div className="wallet--token-buttons">
                <a href="#" className="btn small full-width dark" onClick={() => { onPercentUp(25); setPercent(25) }}>25%</a>
                <a href="#" className="btn small full-width dark" onClick={() => { onPercentUp(50); setPercent(50) }}>50%</a>
                <a href="#" className="btn small full-width dark" onClick={() => { onPercentUp(75); setPercent(75) }}>75%</a>
                <a href="#" className="btn small full-width dark" onClick={() => { onPercentUp(100); setPercent(100) }}>100%</a>
            </div>
            <hr/>
            <div className="wallet--footer">
                {approveLoading ? 
                <button type="button" className="btn full-width sell disabled">
                  <LoadingIcon />
                </button>
                :!allowance || allowance && tokenAmount && percent && allowance / Math.pow(10, decimals) < tokenAmount * percent / 100 ?
                <button type="button" className="btn full-width approve green" onClick={onApproveClick}>Approve</button> 
                : <button type="button" className="btn full-width approve green disabled">Approve</button>
              }
              {sellLoading ? 
                <button type="button" className="btn full-width sell disabled">
                  <LoadingIcon />
                </button>
                :  !allowance || allowance && tokenAmount && percent && allowance / Math.pow(10, decimals) < tokenAmount * percent / 100 ?
                <button type="button" className="btn full-width sell red disabled">Sell</button>
                :
                <button type="button" className="btn full-width sell red" onClick={onSellClick}>Sell</button>
              }
              {pendings.length > 0 ? 
                <>
                  <a href={(process.env.REACT_APP_NETWORK == "mainnet" ? "https://etherscan.io/tx/": "https://ropsten.etherscan.io/tx/") + pendings[0].hash} target="_blank" className="btn full-width sell green">View EtherScan</a>
                  {speedupLoading ? 
                    <button type="button" className="btn full-width sell red disabled"><LoadingIcon /></button>
                  :
                    <button type="button" className="btn full-width sell red" onClick={() => {onSpeedClick(pendings[0].hash)}}>Speed Up</button>
                  }
                </>
                :
                <></>
              }
            </div>
        </div>
    )
}