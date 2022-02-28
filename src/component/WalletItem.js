import { useState, useEffect } from 'react';
import {ethers} from 'ethers';
import LoadingIcon from './LoadingIcon';
import ethIcon from '../images/svg/ETH-circle-icon.svg';
import NotificationManager from 'react-notifications/lib/NotificationManager';

const provider = new ethers.providers.JsonRpcProvider(process.env.REACT_APP_RPC_URL);

export default function WalletItem({idx, accounts, tokens, ethBalances100, ethPrice, setting, balance, pendings, addTransaction, socketNum, onDelClick, onChangeAccount, onChangeToken, onChangePercent, refreshInfo}) {
  
  const [percent, setPercent] = useState(100);
  const [tokenAmount, setTokenAmount] = useState(0);
  
  const [approveLoading, setApproveLoading] = useState(false);
  const [sellLoading, setSellLoading] = useState(false);
  const [speedupLoading, setSpeedupLoading] = useState(false);

  useEffect(() => {
    setPercent(setting.percent);
  }, [setting.percent]);

  let decimals = 0;
  let symbol = "";
  
  if(setting.tokenAddy) {
    for(var i = 0; i < tokens.length; i ++) {
      if(tokens[i].address == setting.tokenAddy) {
        decimals = tokens[i].decimals;
        symbol = tokens[i].symbol;
      }
    }
  }

  useEffect(() => {
    console.log("wallet or token has changed", idx, setting);
    if(setting.walletAddy && setting.tokenAddy)
    tokens.map(token => {
      if(token.address == setting.tokenAddy) {
        const tokenContract = new ethers.Contract(setting.tokenAddy, [
          'function balanceOf(address account) external view returns (uint256)'
        ], provider);
        tokenContract.balanceOf(setting.walletAddy).then(value => {
          setTokenAmount(ethers.utils.formatUnits(value, token.decimals));
        })
      }
    })
  }, [setting.walletAddy, setting.tokenAddy]);

  useEffect(() => {
    console.log("idx has changed", idx);
  }, [idx]);

  useEffect(() => {
    console.log("tokens has changed", idx, tokens);
  }, [tokens]);

  useEffect(() => {
    console.log("balance has changed", idx, balance);
  }, [balance]);
  
  const onApproveClick = () => {
    try {
      const requestOption = {
        method: "POST",
        body: JSON.stringify({
          ...setting
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
      
      if (!setting.walletAddy || !setting.tokenAddy || !setting.percent) {
        NotificationManager.warning("setting is invalid");
        return;
      }
      const requestOption = {
        method: "POST",
        body: JSON.stringify({
          ...setting, maxFeePerGas: gasMaxFee, maxPriorityFeePerGas : maxPriorityFee, gasLimit, slippage, socketNum, idx
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
            if(r.tokenAddy == setting.tokenAddy) {
              setTokenAmount(tokenAmount * (100 - percent) / 100);
              refreshInfo();
            }
            setSellLoading(false);
            const {transactionHash: hash} = r;
            NotificationManager.success(
              <a href={`https://${process.env.REACT_APP_NETWORK == "ropsten" ? "ropsten": ""}.etherscan.io/tx/${hash}`} target="_blank">
                {hash.substr(0,14) + '...' + hash.substr(-10)}
              </a>,"Success", 10000);
          })
        }
        else {
          res.json().then(r => {
            NotificationManager.error(r.message);
            setSellLoading(false);
          })
        }
      }).catch((err) => {
        NotificationManager.error(err.message);
        setSellLoading(false);
      });
    } catch(err) {
      console.log(err);
      NotificationManager.error(err.message);
      setSellLoading(false);
    }
  }

  const onSpeedClick = (hash) => {
    try {
      const { gasMaxFee, gasLimit, maxPriorityFee, slippage} = localStorage.getItem("gasDetails") ? JSON.parse(localStorage.getItem("gasDetails")): {};
      if(!gasMaxFee || !gasLimit || !maxPriorityFee || !slippage) { NotificationManager.warning("gas Info not correct"); return; }
      
      const requestOption = {
        method: "POST",
        body: JSON.stringify({
          ...setting, maxFeePerGas: gasMaxFee, maxPriorityFeePerGas : maxPriorityFee, gasLimit, slippage, socketNum, hash
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
            if(r.tokenAddy == setting.tokenAddy) {
              setTokenAmount(tokenAmount * (100 - percent) / 100);
              refreshInfo();
            }
            setSellLoading(false);
            const {transactionHash: hash} = r;
            NotificationManager.success(
              <a href={`https://${process.env.REACT_APP_NETWORK == "ropsten" ? "ropsten": ""}.etherscan.io/tx/${hash}`} target="_blank">
                {hash.substr(0,14) + '...' + hash.substr(-10)}
              </a>,"Success", 10000);
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
            <div className="wallet--delete-button" title="Delete Panel"  onClick={() => onDelClick(idx)}>
                <a><i className="fas fa-times"></i></a>
            </div>
            <div className="wallet--input-group">
                <select
                    className="form-select"
                    aria-label="Default select wallet"
                    value={setting.walletAddy}
                    onChange={(event) => {onChangeAccount(idx, event.target.value)}}
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
                    value={setting.tokenAddy}
                    onChange={(event) => {onChangeToken(idx, event.target.value)}}
                >
                    <option value="">Token</option>
                    {
                        tokens.filter((token) => {
                          if(idx == 3) console.log("ethBalances100", ethBalances100);
                          if(ethBalances100[token.address] == undefined) return true;
                          if(idx == 3) {
                            console.log(token, setting);
                            console.log(ethers.utils.formatEther(ethBalances100[token.address][setting.walletAddy]) * ethPrice);
                          }
                          if(setting.walletAddy == 0) return true;
                          if(ethers.utils.formatEther(ethBalances100[token.address][setting.walletAddy]) * ethPrice >= 50) return true;
                          else return false;
                        }).map((token, token_idx) => {
                          return <option key={token_idx} value={token.address}>{token.name}({token.symbol})</option>
                        })
                    }
                </select>
            </div>

            <div className="wallet--token-amount-group">
                <div className="amount-price-ethereum">
                  <img src={ethIcon} />
                  <h6>{balance ? (balance*1).toFixed(6) : 0}(${ balance ? (balance*ethPrice).toFixed(1) : 0})</h6>
                </div>
                <input
                    type="range" className="customrange" min="0" max="100" step="1" value={percent}
                    style={{background: 'linear-gradient(to right, #3c3e42 0%, #3c3e42 ' + percent + '%, #1a1a1e ' + percent + '%, #1a1a1e ' + percent + '%)'}}
                    onChange={(event) => setPercent(event.target.value)}
                    onMouseUp={() => onChangePercent(idx, percent)}
                />
                <div className="amount-token-flex">
                    <p className="token-amount">{(tokenAmount*1).toFixed(3)} {symbol}</p>
                    <p>{percent}%</p>
                </div>
            </div>
            <div className="wallet--token-buttons">
                <a className="btn small full-width dark" onClick={() => { onChangePercent(idx, 25); setPercent(25) }}>25%</a>
                <a className="btn small full-width dark" onClick={() => { onChangePercent(idx, 50); setPercent(50) }}>50%</a>
                <a className="btn small full-width dark" onClick={() => { onChangePercent(idx, 75); setPercent(75) }}>75%</a>
                <a className="btn small full-width dark" onClick={() => { onChangePercent(idx, 100); setPercent(100) }}>100%</a>
            </div>
            <hr/>
            <div className="wallet--footer">
              {
                approveLoading ? 
                  <button type="button" className="btn full-width sell disabled">
                    <LoadingIcon />
                  </button>
                :
                  <button type="button" className="btn full-width approve green" onClick={onApproveClick}>Approve</button> 
              }
              {
                sellLoading || pendings.length > 0 ? 
                  <button type="button" className="btn full-width sell disabled">
                    <LoadingIcon />
                  </button>
                :
                  <button type="button" className="btn full-width sell red" onClick={onSellClick}>Sell</button>
              }
              {
                pendings.length > 0 &&
                <>
                  <a href={(process.env.REACT_APP_NETWORK == "mainnet" ? "https://etherscan.io/tx/": "https://ropsten.etherscan.io/tx/") + pendings[0].hash} target="_blank" className="btn full-width sell green">View EtherScan</a>
                  {speedupLoading ? 
                    <button type="button" className="btn full-width sell red disabled"><LoadingIcon /></button>
                  :
                    <button type="button" className="btn full-width sell red" onClick={() => {onSpeedClick(pendings[0].hash)}}>Speed Up</button>
                  }
                </>
              }
            </div>
        </div>
  )
}