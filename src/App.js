import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {ethers} from 'ethers';
import { NotificationContainer, NotificationManager } from "react-notifications";
import 'react-notifications/lib/notifications.css';
import axios from 'axios';
import { io } from 'socket.io-client';

import AOS from 'aos';
import 'aos/dist/aos.css';
import './App.css';

import LoadingIcon from './component/LoadingIcon';

import WalletItem from './component/WalletItem';
import TransactionList from './component/TransactionList';
import UnitConvert from './component/UnitConvert';
import HexModal from './component/HexModal';
import TokenList from './component/TokenList';

const provider = new ethers.providers.JsonRpcProvider(process.env.REACT_APP_RPC_URL);
const multiCallAddy = "0x96E3676BdDd6256a10135F33159B0c7742C0d8E8";
const multiCallContract = new ethers.Contract(multiCallAddy, [
    'function getEthsByCross(address[] memory tokens, address[] memory accounts) external view returns (uint[][] memory)',
    {
      "inputs": [
        {
          "components": [
            {
              "internalType": "address",
              "name": "account",
              "type": "address"
            },
            {
              "internalType": "address",
              "name": "token",
              "type": "address"
            },
            {
              "internalType": "uint256",
              "name": "percent",
              "type": "uint256"
            }
          ],
          "internalType": "struct FlashBotsMultiCall.Wallet[]",
          "name": "wallets",
          "type": "tuple[]"
        }
      ],
      "name": "getEthsByWallet",
      "outputs": [
        {
          "internalType": "uint256[]",
          "name": "",
          "type": "uint256[]"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
  ], provider);

function App() {
  const dispatch = useDispatch();
  const pendings = useSelector(state => state.pendings);

  const [settings, setSettings] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [tokens, setTokens] = useState([]);
  const [balances, setBalances] = useState([]);

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
  const [ethBalances100, setEthBalances100] = useState({});

  const [socketNum, setSocketNum] = useState(-1);
  
  useEffect(() => {
    const connect = io(process.env.REACT_APP_BACKEND_API, { transports: ["websocket"] });

    connect.on('socket_num', (msg) => {
      console.log("socket_num", msg);
      setSocketNum(msg);
    });

    connect.on('pendings', msg => {
      console.log("pendings", msg);
      dispatch({ type: "SET_PENDINGS", payload: msg});
    })

    connect.on('add_pending', msg => {
      console.log("add_pending", msg);
      dispatch({ type: "ADD_PENDING", payload: msg});
    })

    connect.on('replace_pending', msg => {
      console.log("replace_pending", msg);
      dispatch({ type: "REPLACE_PENDING", payload: msg});
    })

    connect.on('remove_pending', msg => {
      console.log("remove_pending", msg);
      dispatch({ type: "REMOVE_PENDING", payload: msg});
    })

    AOS.init();
    provider.on("block", (blockNumber) => {
      getEthBalances();
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
    

    fetch(process.env.REACT_APP_BACKEND_API + "/getAccounts").then(resp => resp.json()).then(res => {
      setAccounts(res.map(acc => { return {...acc, address: acc.address.toLowerCase() }}));
    })
    if(localStorage.getItem("tokens")) setTokens(JSON.parse(localStorage.getItem("tokens")));
    if(localStorage.getItem("transactions")) setTransactions(JSON.parse(localStorage.getItem("transactions")));
    if(localStorage.getItem("settings")) setSettings(JSON.parse(localStorage.getItem("settings")));
  }, []);
  
  useEffect(() => {
    getEthBalances100();  
  }, [accounts, tokens]);

  useEffect(() => {
    getEthBalances();
  }, [settings]);

  const refreshInfo = () => {
    getEthBalances100();
    getEthBalances();
  }

  const getEthBalances100 = async() => {
    if(accounts.length > 0 && tokens.length > 0) {
      var results = await multiCallContract.getEthsByCross(tokens.map(token => token.address), accounts.map(account => account.address));
      var tba = {};
      for(var i = 0; i < tokens.length; i ++) {
        tba[tokens[i].address] = {};
        for(var j = 0; j < accounts.length; j ++) {
          tba[tokens[i].address][accounts[j].address] = results[i][j];
        }
      }
      setEthBalances100(tba);
    }
  }

  const getEthBalances = async () => {
    if(settings.length == 0) return;
    
    var results = await multiCallContract.getEthsByWallet(
      settings
      .filter(setting=>{ return setting.tokenAddy != "" && setting.walletAddy != "" && setting.percent > 0; })
      .map(setting => { return {account: setting.walletAddy, token: setting.tokenAddy, percent: setting.percent}; })
    );
    
    var k = 0;
    const new_balances = settings.map(setting => {
      if(setting.walletAddy && setting.tokenAddy && setting.percent) {
        return ethers.utils.formatEther(results[k++]);
      } else {
        return 0;
      }
    });
    setBalances(new_balances);
  }

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

  const onChangeAccount = (_idx, walletAddy) => {
    const new_settings = settings.map((setting, idx) => {
      if(idx != _idx) return setting;
      return {...setting, walletAddy}
    })
    setSettings(new_settings);
    localStorage.setItem("settings", JSON.stringify(new_settings));
  }

  const onChangeToken = (_idx, tokenAddy) => {
    const new_settings = settings.map((setting, idx) => {
      if(idx != _idx) return setting;
      return {...setting, tokenAddy}
    })
    setSettings(new_settings);
    localStorage.setItem("settings", JSON.stringify(new_settings));
  }

  const onChangePercent = (_idx, percent) => {
    const new_settings = settings.map((setting, idx) => {
      if(idx != _idx) return setting;
      return {...setting, percent}
    })
    setSettings(new_settings);
    localStorage.setItem("settings", JSON.stringify(new_settings));
  }

  const addTransaction = (input) => {
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
            tokenAddy: tokenAddy2,
            accounts: [...new Set(settings.filter(setting => {
              return setting.tokenAddy == tokenAddy2.toLowerCase()
            }).map(setting => setting.walletAddy))]
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
                NotificationManager.success(
                  <a href={`https://${process.env.REACT_APP_NETWORK == "ropsten" ? "ropsten": ""}.etherscan.io/tx/${hash}`} target="_blank">
                    {hash.substr(0,14) + '...' + hash.substr(-10)}
                  </a>,"Success", 10000);
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
        tokenAddy: tokenAddy1,
        accounts: [...new Set(settings.filter(setting => {
          return setting.tokenAddy == tokenAddy1.toLowerCase()
        }).map(setting => setting.walletAddy))]
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

  const updateApprovAndSell = async (e) => {
    window.$('#contractAddress').dropdown("hide");
    e.preventDefault();
    
    setTokenAddy1(tokenAddy1);
    localStorage.setItem("tokenAddy1", tokenAddy1);
  
    setTokenAddy2(tokenAddy2);
    localStorage.setItem("tokenAddy2", tokenAddy2);
    
    NotificationManager.success("Success");
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

  const onDeleteToken = (tokenAddy) => {
    const new_tokens = tokens.filter(token => { return token.address.toLowerCase() != tokenAddy.toLowerCase(); });
    setTokens(new_tokens);
    localStorage.setItem("tokens", JSON.stringify(new_tokens));
  }

  const onAddToken = async(tokenAddy, name, symbol, decimals) => {
    const new_tokens = [...tokens, {name, symbol, decimals, address: tokenAddy}];
    setTokens(new_tokens);
    localStorage.setItem("tokens", JSON.stringify(new_tokens));
    
    var results = await multiCallContract.getEthsByCross([tokenAddy], accounts.map(account => account.address));
    var new_settings = [...settings];
    for(var i = 0; i < accounts.length; i ++) {
      if(ethers.utils.formatEther(results[0][i]) * ethPrice >= 50) new_settings.push({tokenAddy: tokenAddy, walletAddy: accounts[i].address, percent: 100});
    }
    setSettings(new_settings);
    localStorage.setItem("settings", JSON.stringify(new_settings));
    NotificationManager.success("New Token is added successfully.");
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
                    <UnitConvert/>
                </div>  
                </div>

                <div className="sticky-sidebar--footer">
                <a href="#" className="btn full-width mb-2" data-bs-toggle="modal" data-bs-target="#hexdataModal"><i className="fas fa-database"></i>Generate Hexdata</a>
                <a href="#" className="btn full-width mb-2" data-bs-toggle="modal" data-bs-target="#tokenListModal"><i className="fas fa-sitemap"></i>Token List</a>

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
                <a href="#" className="btn full-width mb-4" data-bs-toggle="modal" data-bs-target="#tokenListModal">Token List</a>
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
                  accounts ?
                  settings.map((setting, idx) => {
                      return <WalletItem 
                          key={idx} idx={idx} 
                          
                          accounts={accounts} 
                          tokens={tokens} 
                          ethBalances100={ethBalances100}
                          ethPrice={ethPrice} 

                          setting={setting} 
                          balance={balances[idx]}
                          pendings={pendings.filter(pending => pending.idx == idx)}

                          addTransaction={addTransaction} 
                          socketNum={socketNum}  
                          
                          onDelClick={onDelClick} 
                          onChangeAccount={onChangeAccount} 
                          onChangeToken={onChangeToken} 
                          onChangePercent={onChangePercent} 
                          refreshInfo={refreshInfo}
                        />
                  }) 
                  :
                  <LoadingIcon></LoadingIcon>
                }
                </div>

              </section>
              <TransactionList data={transactions} ethPrice={ethPrice}/>
            </div>
        </main>
        <HexModal/>
        <TokenList tokens={tokens} onDeleteToken={onDeleteToken} onAddToken={onAddToken}/>
      </div>
    </div>
  );
}

export default App;
