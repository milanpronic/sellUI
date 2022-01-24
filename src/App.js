import { useEffect, useState } from 'react';
import {ethers} from 'ethers';
import { NotificationContainer, NotificationManager } from "react-notifications";
import axios from 'axios';
import { io } from 'socket.io-client';
import AOS from 'aos';
import WalletItem from './component/WalletItem';
import TransactionList from './component/TransactionList';
import LoadingIcon from './component/LoadingIcon';
import 'react-notifications/lib/notifications.css';
import 'aos/dist/aos.css';
import './App.css';

const provider = new ethers.providers.JsonRpcProvider(`https://${process.env.REACT_APP_NETWORK}.infura.io/v3/1c8b15f18bcf4477810d7d44980d2413`);
const routerAddy = "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D";
const routerContract = new ethers.Contract(routerAddy, ['function getAmountsOut(uint amountIn, address[] memory path) external view returns (uint[] memory amounts)', 'function WETH() external pure returns (address)'], provider);
const abiCoder = new ethers.utils.AbiCoder();

function App() {

  const [settings, setSettings] = useState([]); 
  const [accounts, setAccounts] = useState([]);
  const [tokens, setTokens] = useState([]);
  const [clock, setClock] = useState(0);
  const [transactions, setTransactions] = useState([]);
  const [gasMaxFee, setGasMaxFee] = useState('');
  const [maxPriorityFee, setMaxPriorityFee] = useState('');
  const [gasLimit, setGasLimit] = useState('');
  const [slippage, setSlippage] = useState('');

  const [tokenAddy1, setTokenAddy1] = useState("");
  const [tokenAddy2, setTokenAddy2] = useState("");
  const [approveAllLoading, setApproveAllLoading] = useState(false);
  const [sellAllLoading, setSellAllLoading] = useState(false);
  const [ethPrice, setETHPrice] = useState(0);
  const [gasFee, setGasFee] = useState(0);
  const [wei, setWei] = useState('');
  const [gwei, setGwei] = useState('');
  const [ether, setEther] = useState('');

  const [amountIn, setAmountIn] = useState("");
  const [amountOutMin, setAmountOutMin] = useState("");
  const [path, setPath] = useState("");
  const [deadline, setDeadline] = useState("");
  const [recipient, setRecipient] = useState("");
  const [hex, setHex] = useState("");

  const [socketNum, setSocketNum] = useState(-1);
  const [pendings, setPendings] = useState([]);

  const onGenerateClick = () => {
    const paraHex = abiCoder.encode(["uint", "uint", "address[]", "address", "uint"], [amountIn, amountOutMin, JSON.parse(path), recipient, deadline]);
    localStorage.setItem("generate_data", JSON.stringify({amountIn, amountOutMin, path: JSON.parse(path), recipient, deadline, hex: "0x791ac947" + paraHex.substr(2)}));
    setHex("0x791ac947" + paraHex.substr(2));
  }

  useEffect(() => {
    const connect = io(process.env.REACT_APP_BACKEND_API, { transports: ["websocket"] });

    connect.on('socket_num', (msg) => {
      console.log("socket_num", msg);
      setSocketNum(msg);
    });

    connect.on('pendings', msg => {
      console.log("pendings", msg);
      setPendings(msg.map(pending => {
        return {idx: pending.idx, hash: pending.hash}
      }))
    })

    connect.on('pending', msg => {
      console.log("pending", msg);
      addPending(msg);
    })

    AOS.init();
    provider.on("block", async (blockNumber) => {
      setClock(blockNumber);
    })

    if(localStorage.getItem("tokenAddy1")) setTokenAddy1(localStorage.getItem("tokenAddy1"));
    if(localStorage.getItem("tokenAddy2")) setTokenAddy2(localStorage.getItem("tokenAddy2"));

    if (localStorage.getItem("gasDetails")) {
      const { gasMaxFee, gasLimit, maxPriorityFee, slippage} = JSON.parse(localStorage.getItem("gasDetails"));
      if (gasMaxFee) setGasMaxFee(gasMaxFee);
      if (gasLimit) setGasLimit(gasLimit);
      if (maxPriorityFee) setMaxPriorityFee(maxPriorityFee);
      if (slippage) setSlippage(slippage);
    }
    getETHPrice();
    getGasFee();
    

    if(localStorage.getItem("generate_data")) {
      const params = JSON.parse(localStorage.getItem("generate_data"));
      setAmountIn(params.amountIn);
      setAmountOutMin(params.amountOutMin);
      setPath(JSON.stringify(params.path));
      setRecipient(params.recipient);
      setDeadline(params.deadline);
      setHex(params.hex);
    }
  }, []);
  
  const addPending = (pending) => {
    setPendings([...pendings, pending]);
  }

  useEffect(() => {
    fetch(process.env.REACT_APP_BACKEND_API + "/getAccounts").then(resp => resp.json()).then(res => {
        setAccounts(res.map(acc => { return {...acc, address: acc.address.toLowerCase() }}));
    })
    if(localStorage.getItem("tokens")) setTokens(JSON.parse(localStorage.getItem("tokens")));
    if(localStorage.getItem("settings")) setSettings(JSON.parse(localStorage.getItem("settings")));
    if(localStorage.getItem("transactions")) setTransactions(JSON.parse(localStorage.getItem("transactions")));
  }, []);

  const getETHPrice = async () => {
    await axios.get("https://api.etherscan.io/api?module=stats&action=ethprice&apikey=5Z1RRTM3R1VF8U9BS6DVBZZEACU5XUN59Q").then((res) => {
      const { result } = res.data;
      setETHPrice(result.ethusd);
      setTimeout(getETHPrice, 3000);
    })
  }

  const getGasFee = async() => {
    const feeData = await provider.getFeeData();
    const fee = ethers.utils.formatUnits(feeData.gasPrice, "gwei");
    setGasFee(fee);
    setTimeout(getGasFee, 10000);
  }

  const addNewSetting = () => {
    const new_settings = [...settings, {
      walletAddy: "",
      tokenAddy: "",
      percent: 100,
    }];
    setSettings(new_settings);
    localStorage.setItem("settings", JSON.stringify(new_settings));
  }

  const onDelClick = (_idx) => {
    const new_settings = settings.filter((setting, idx) => {
      return idx != _idx;
    })
    setSettings(new_settings);
    localStorage.setItem("settings", JSON.stringify(new_settings));
  }

  const onChangeSetting = (_idx, _setting) => {
    const new_settings = settings.map((setting, idx) => {
      if(idx == _idx) return _setting;
      else return setting;
    });
    setSettings(new_settings);
    localStorage.setItem("settings", JSON.stringify(new_settings));
  }

  const addTransaction = (input) => {
    setPendings(pendings.filter(pending => pending.hash != input.transactionHash && pending.hash != input.oldHash));

    //console.log(input);
    var accountName, tokenName, tokenSymbol, tokenDecimals, time;
    accounts.map(account => {
      if(account.address.toLowerCase() == input.walletAddy.toLowerCase()) accountName = account.name;
    })
    tokens.map(token => {
      if(token.address.toLowerCase() == input.tokenAddy.toLowerCase()) {
        tokenName = token.name;
        tokenSymbol = token.symbol;
        tokenDecimals = token.decimals;
      }
    })
    time = new Date(input.time);
    const new_transactions = [...transactions, {
      accountName, tokenName, tokenSymbol, time: time.toISOString(), amountIn: ethers.utils.formatUnits(input.amountIn, tokenDecimals), amountOut: ethers.utils.formatEther(input.amountOut)
    }];
    //console.log(new_transactions);
    setTransactions(new_transactions);
    localStorage.setItem("transactions", JSON.stringify(new_transactions));
  }
  
  const addBulkTransactions = (inputs) => {
    
    var accountName, tokenName, tokenSymbol, tokenDecimals, time;
    var new_transactions = [...transactions];
    inputs.map(input => {
      accounts.map(account => {
        if(account.address.toLowerCase() == input.walletAddy.toLowerCase()) accountName = account.name;
      })
      tokens.map(token => {
        if(token.address.toLowerCase() == input.tokenAddy.toLowerCase()) {
          tokenName = token.name;
          tokenSymbol = token.symbol;
          tokenDecimals = token.decimals;
        }
      })
      time = new Date(input.time);
      new_transactions.push({
        accountName, tokenName, tokenSymbol, time: time.toISOString(), amountIn: ethers.utils.formatUnits(input.amountIn, tokenDecimals), amountOut: ethers.utils.formatEther(input.amountOut)
      });
    })
    //console.log(new_transactions);
    setTransactions(new_transactions);
    localStorage.setItem("transactions", JSON.stringify(new_transactions));
  }

  const onSellAllClick = () => {
    if(tokenAddy2 == "") {
      NotificationManager.warning("sell contract address is empty!");
      return ;
    }
      try {
        const requestOption = {
          method: "POST",
          body: JSON.stringify({
            tokenAddy: tokenAddy2
          }),
          headers: {
            "Content-type": "application/json"
          }
        }
        setSellAllLoading(true);
        fetch(process.env.REACT_APP_BACKEND_API + "/sellAll", requestOption).then(res => {
          console.log(res);
          if(res.status == 200) {
            res.json().then(r => {
              console.log('transactions',r);
              r.transactions.map(item => {
                const { transactionHash: hash } = item;
                NotificationManager.success(<a href={`https://ropsten.etherscan.io/tx/${hash}`} target="_blank">{hash.substr(0,14) + '...' + hash.substr(-10)}</a>,"Success", 10000);
              })
              addBulkTransactions(r.transactions);
              setSellAllLoading(false);
            })
          }
          else {
            res.json().then(r => {
              NotificationManager.error(r.message);
              setSellAllLoading(false);
            })
          }
        }).catch((err) => {
          NotificationManager.error(err.message);
          setSellAllLoading(false);
        });
      } catch(err) {
        NotificationManager.error(err.message);
        setSellAllLoading(false);
      }
  }

  const onApproveAllClick = () => {
    if(tokenAddy1 == "") {
      NotificationManager.warning("sell contract address is empty!");
      return ;
    }
    
    const requestOption = {
      method: "POST",
      body: JSON.stringify({
        tokenAddy: tokenAddy1
      }),
      headers: {
        "Content-type": "application/json"
      }
    }
    setApproveAllLoading(true);
    fetch(process.env.REACT_APP_BACKEND_API + "/approveAll", requestOption).then(res => {
      if(res.status == 200) {
        res.json().then(r => {
          NotificationManager.success("Success");
          setApproveAllLoading(false);
        })
      }
      else {
        res.json().then(r => {
          NotificationManager.error(r.message);
          setApproveAllLoading(false);
        })
      }
    }).catch((err) => {
      NotificationManager.error(err.message);
      setApproveAllLoading(false);
    });
  }

  const checkAddy = async (tokenAddy) => {
    let tokens = [];
    if(localStorage.getItem("tokens")) {
      tokens = JSON.parse(localStorage.getItem("tokens"));
    }
    for(var i = 0; i < tokens.length; i ++) {
      if(tokens[i].address == tokenAddy) return;
    }
    const tokenContract = new ethers.Contract(tokenAddy, [
      'function name() external view returns (string memory)', 
      'function symbol() external view returns (string memory)',
      'function decimals() external view returns (uint8)'
    ], provider);
    const name = await tokenContract.name();
    const symbol = await tokenContract.symbol();
    const decimals = await tokenContract.decimals();
    tokens.push({name, symbol, decimals, address: tokenAddy});
    localStorage.setItem("tokens", JSON.stringify(tokens));
  }

  const updateApprovAndSell = async (e) => {
    window.$('#contractAddress').dropdown("hide");
    e.preventDefault();
    if(tokenAddy1) {
      setTokenAddy1(tokenAddy1);
      localStorage.setItem("tokenAddy1", tokenAddy1);
      checkAddy(tokenAddy1.toLowerCase());
    }
    if(tokenAddy2) {
      setTokenAddy2(tokenAddy2);
      localStorage.setItem("tokenAddy2", tokenAddy2);
      checkAddy(tokenAddy2.toLowerCase());
    }
    NotificationManager.success("Success");
    if(tokenAddy1) await checkAddy(tokenAddy1.toLowerCase());
    if(tokenAddy2) await checkAddy(tokenAddy2.toLowerCase());
  }

  const updateGasDetails = (e) => {
    e.preventDefault();
    if (gasMaxFee && gasLimit && maxPriorityFee && slippage) {
      const details = JSON.stringify({ gasMaxFee, gasLimit, maxPriorityFee, slippage});
      localStorage.setItem("gasDetails", details);
      window.$('#gasSetting').dropdown('hide');
      NotificationManager.success("Success");
    }

    else {
      NotificationManager.Warning("Addresses are not valid!");
      if (localStorage.getItem("gasDetails")) {
        const { gasMaxFee, gasLimit, maxPriorityFee, slippage} = JSON.parse(localStorage.getItem("gasDetails"));
        if (gasMaxFee) setGasMaxFee(gasMaxFee);
        if (gasLimit) setGasLimit(gasLimit);
        if (maxPriorityFee) setMaxPriorityFee(maxPriorityFee);
        if (slippage) setSlippage(slippage);
      }
    }
  }

  const formatUnit = () => {
    setWei('');
    setGwei('');
    setEther('');
  }

  const onChangeWei = (val) => {
    if (!val) formatUnit();
    else {
      setWei(val);
      setGwei(ethers.utils.formatUnits(val,"gwei"));
      setEther(ethers.utils.formatEther(val));
    }
  }

  const onChangeGwei = (val) => {
    if (!val) formatUnit();
    else {
      setWei(ethers.utils.parseUnits(val,"gwei"));
      setGwei(val);
      setEther(ethers.utils.formatEther(ethers.utils.parseUnits(val,"gwei")));
    }
  }

  const onChangeEther = (val) => {
    if (!val) formatUnit();
    else {
      setGwei(ethers.utils.formatUnits(ethers.utils.parseEther(val),"gwei"));
      setWei(ethers.utils.parseEther(val));
      setEther(val);
    }
  }

  return (
    <div className="App">
      <NotificationContainer/>
      <div className="page-layout">

        <button className="page-layout--toggle close" id="sidebar-toggle"></button>

        <div className="sticky-sidebar" data-aos="fade-right">
            <div className="sticky-sidebar--inner">
                <div className="sticky-sidebar--header">
                <img src="/resources/images/avatar-icon.png" className="profile-icon"/>
                <h1>Eon Wallet Dashboard</h1>
                <hr/>
                <div className="sticky-sidebar--navigation">
                    <h6>Quick View</h6>
                    <ul>
                    <li><a href="#wallets" className="nav-item"><i className="fas fa-wallet"></i>Wallets</a></li>
                    <li><a href="#transactions" className="nav-item"><i className="fas fa-list-ul"></i>Transactions</a></li>
                    </ul>

                    <h6>Offsite Links</h6>
                    <ul>
                    <li><a href="https://opensea.io/" target="_blank" className="nav-item"><img src="resources/images/svg/opensea-icon-white.svg"/> OpenSea</a></li>
                    <li><a href="https://explorer.blocknative.com/?v=1.29.2&0=ethereum&1=main&s=%7B%22name%22%3A%22My+subscription+1%22%2C%22address%22%3A%220xe3064bdddb253dfd1e8e8f94bb2a7a760d94a70e%22%2C%22fields%22%3A%5B%22watchedAddress%22%2C%22contractCall.methodName%22%2C%22status%22%5D%7D" target="_blank" className="nav-item"><img src="resources/images/svg/mempool.svg"/> Mempool Explorer</a></li>
                    <li><a href="https://ethervm.io/decompile/0x2E65C91716fE7eABFb0c5c78E3447105EDabc8cb" target="_blank" className="nav-item"><img src="resources/images/svg/decompiler.svg"/> Decompiler</a></li>
                    </ul>
                    <hr/>
                    <h6>Ethereum Unit Converter</h6>
                    <ul className="ethereum-unit-converter-list">
                    <li>
                        <label>Wei</label>
                        <input type="text" placeholder="Wei" className="form-control" id="wei-converter" aria-describedby="wei-converter" value={wei} onChange={(e) => onChangeWei(e.target.value)}/>
                    </li>
                    <li>
                        <label>Gwei</label>
                        <input type="text" placeholder="Gwei" className="form-control" id="gwei-converter" aria-describedby="gwei-converter" value={gwei} onChange={(e) => onChangeGwei(e.target.value)}/>
                    </li>
                    <li>
                        <label>Ether</label>
                        <input type="text" placeholder="Ether" className="form-control" id="ether-converter" aria-describedby="ether-converter" value={ether} onChange={(e) => onChangeEther(e.target.value)}/>
                    </li>
                    </ul>
                </div>  
                </div>

                <div className="sticky-sidebar--footer">
                <a href="#" className="btn full-width mb-2" data-bs-toggle="modal" data-bs-target="#hexdataModal"><i className="fas fa-database"></i>Generate Hexdata</a>
                <p>Dashboard Version v1.1</p>
                <p>Data: 05-12-2021 21:01:00</p>
                </div>
            </div>
        </div>

        <main>
            <div className="container">
                <section id="mobile-header">
                <h5>Eon Wallet Dashboard</h5>
                <a href="#" className="btn full-width mb-4" data-bs-toggle="modal" data-bs-target="#hexdataModal">Generate Hexdata</a>
                </section>
                <section id="wallets">
                <div className="section-title--flex">
                    <h4 className="section-title" data-aos="fade-right"><i className="fas fa-wallet me-3"></i>Wallets</h4>
                    <div className="live-prices--column">
                    <div className="live-prices--block live">
                        <p><span></span> Ethereum Live Price</p>
                        <h5>{(ethPrice*1).toFixed(2)} USD</h5>
                    </div>
                    <div className="live-prices--block live">
                        <p><span></span> Ethereum Gas Fees</p>
                        <h5>{(gasFee*1).toFixed(2)}</h5>
                    </div>
                    </div>
                </div>
                <div className="wallets--header">
                    <div className="wallets--header-left">
                    <a href="#" className="add-wallet" onClick={addNewSetting}>
                        <i className="fas fa-wallet"></i>
                        <p>Add Wallet</p>
                    </a>
                    </div>
                    <div className="wallets--header-right">
                        {approveAllLoading ? 
                          <button type="button" className="btn full-width approve disabled"><LoadingIcon /></button>
                          :
                          <button type="button" className="btn full-width approve green" onClick={onApproveAllClick}>Approve All</button>
                        }
                        {sellAllLoading ? 
                          <button type="button" className="btn full-width sell red disabled"><LoadingIcon /></button>
                          :
                          <button type="button" className="btn full-width sell red" onClick={onSellAllClick}>Sell All</button>
                        }
                        <div className="dropdown">
                            <button className="btn btn-secondary dropdown-toggle" type="button" id="contractAddress" data-bs-toggle="dropdown" aria-expanded="false" data-bs-auto-close="outside">
                              <i className="fas fa-cogs"></i>
                            </button>
                            <form className="dropdown-menu dropdown-menu-lg-end" id="public-address-popup" aria-labelledby="contractAddress" data-bs-auto-close={"false"}>
                                <li>
                                  <label>Approve Contract Address</label>
                                    <input
                                      type="text" placeholder="Contract Address"
                                      className="form-control approve-input"
                                      id="approve-contract-address"
                                      aria-describedby="approve-contract-address"
                                      value={tokenAddy1}
                                      onChange={(event) => {setTokenAddy1(event.target.value)}}
                                      required
                                    />
                                  </li>
                                <li>
                                    <label>Sell Contract Address</label>
                                    <input
                                      type="text"
                                      placeholder="Contract Address"
                                      className="form-control sell-input"
                                      id="sell-contract-address"
                                      aria-describedby="sell-contract-address"
                                      value={tokenAddy2}
                                      onChange={(event) => {setTokenAddy2(event.target.value)}}
                                      required
                                    />
                                  </li>
                                <li>
                                <button
                                  type="submit"
                                  className="btn small full-width"
                                  onClick={updateApprovAndSell} 
                                >Save Addresses</button></li>
                            </form>
                        </div>
                        <div className="dropdown">
                            <button className="btn btn-secondary dropdown-toggle" type="button" id="gasSetting" data-bs-toggle="dropdown" aria-expanded="false" data-bs-auto-close="outside">
                                <i className="fas fa-tools"></i>
                            </button>
                            <form className="dropdown-menu dropdown-menu-lg-end" aria-labelledby="gas" onSubmit={updateGasDetails}>
                                <div className="wallet--input-boxes-grid">
                                    <div className="wallet--input-group">
                                        <label>Gas (Max Fee)</label>
                                        <div className="input-group">
                                            <input
                                              type="number"
                                              placeholder="0"
                                              className="form-control"
                                              id="gas"
                                              aria-describedby="gas"
                                              value={gasMaxFee}
                                              onChange={(e) => setGasMaxFee(e.target.value)}
                                              required
                                            />
                                        </div>
                                    </div>
                                    <div className="wallet--input-group">
                                        <label>Tip (Max Priority Fee)</label>
                                        <div className="input-group">
                                            <input
                                              type="number"
                                              placeholder="0"
                                              className="form-control"
                                              id="Limit"
                                              aria-describedby="gas"
                                              required
                                              value={maxPriorityFee}
                                              onChange={(e) => setMaxPriorityFee(e.target.value)}
                                            />
                                        </div>
                                    </div>
                                    <div className="wallet--input-group">
                                        <label>Limit</label>
                                        <div className="input-group">
                                            <input
                                              type="number"
                                              placeholder="0"
                                              className="form-control"
                                              id="Limit"
                                              aria-describedby="gas"
                                              required
                                              value={gasLimit}
                                              onChange={(e) => setGasLimit(e.target.value)}
                                            />
                                        </div>
                                    </div>

                                    <div className="wallet--input-group">
                                        <label>Slippage</label>
                                        <div className="input-group">
                                            <input
                                              type="number"
                                              placeholder="0"
                                              className="form-control"
                                              id="Slippage"
                                              aria-describedby="gas"
                                              required
                                              value={slippage}
                                              onChange={(e) => setSlippage(e.target.value)}
                                            />
                                        </div>
                                    </div>
                                    
                                </div>
                                <div className="mt-2">
                                    <button type="submit" className="btn small full-width">Save</button>
                                </div>
                            </form>
                        </div>
                    </div>

                </div>

                <div className="wallet--grid">
                {
                  settings.map((setting, idx) => {
                    return <WalletItem clock={clock} key={idx} idx={idx} setting={setting} accounts={accounts} tokens={tokens} onChangeSetting={onChangeSetting} onDelClick={onDelClick} routerContract={routerContract} addTransaction={addTransaction} ethPrice={ethPrice} socketNum={socketNum} pendings={pendings.filter(pending => pending.idx == idx)}/>
                  })
                }
                </div>

                </section>
                <TransactionList data={transactions} ethPrice={ethPrice}/>
            </div>
        </main>

        <div className="modal" tabIndex="-1" id="hexdataModal">
            <div className="modal-dialog modal-dialog-centered">
                <div className="modal-content">
                    <div className="modal-header">
                        <h5 className="modal-title">Generate Hexdata</h5>
                        <button type="button" className="btn-close" data-bs-dismiss="modal" aria-label="Close"><i className="fas fa-times"></i></button>
                    </div>
                    <div className="modal-body">
                    <form>
                        <label>AmountIn (Token Amount)</label>
                        <div className="input-group">
                        <input type="number" placeholder="0"  value={amountIn} onChange={(event)=>{setAmountIn(event.target.value)}} className="form-control" id="token-amount" aria-describedby="token-amount" required/>
                        </div>
                        <label>Amount Out Min</label>
                        <div className="input-group">
                        <input type="number" placeholder="1"  value={amountOutMin} onChange={(event)=>{setAmountOutMin(event.target.value)}} className="form-control" id="amount-out-min" aria-describedby="amount-out-min" required/>
                        </div>
                        <label>Path Address</label>
                        <div className="input-group">
                        <input placeholder="address 1, address 2"  value={path} onChange={(event)=>{setPath(event.target.value)}} className="form-control" id="path-address" aria-describedby="path-address" required/>
                        </div>
                        <label>Receiver Address</label>
                        <div className="input-group">
                        <input  value={recipient} onChange={(event)=>{setRecipient(event.target.value)}} className="form-control" id="receiver-address" aria-describedby="receiver-address" required/>
                        </div>
                        <label>Deadline</label>
                        <div className="input-group">
                        <input type="number" placeholder="10000000000000000" value={deadline} onChange={(event)=>{setDeadline(event.target.value)}} className="form-control" id="deadline" aria-describedby="deadline" required/>
                        </div>
                        <label>Hex</label>
                        <div className="input-group">
                        <input value={hex} className="form-control" aria-describedby="deadline" required readOnly/>
                        </div>
                        <button type="button" className="btn green m-auto" onClick={onGenerateClick}>Generate</button>
                    </form>
                    </div>
                </div>
            </div>
        </div>

      </div>
    </div>
  );
}

export default App;
