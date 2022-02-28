import { useEffect, useState } from "react"
import {ethers} from 'ethers';
const provider = new ethers.providers.JsonRpcProvider(process.env.REACT_APP_RPC_URL);

export default function TokenList({tokens, onDeleteToken, onAddToken}) {
    const [tokenAddy, setTokenAddy] = useState("");
    const [name, setName] = useState("");
    const [symbol, setSymbol] = useState("");
    const [decimals, setDecimals] = useState(0);
    
    useEffect(() => {
        if(tokenAddy.length == 42 && tokenAddy.startsWith("0x")) {
            if(tokens.find(token => token.address == tokenAddy)) return;
            const tokenContract = new ethers.Contract(tokenAddy, [
                'function name() external view returns (string memory)', 
                'function symbol() external view returns (string memory)',
                'function decimals() external view returns (uint8)'
            ], provider);
            tokenContract.name().then(rlt => {setName(rlt)}).catch(err => console.log(err));
            tokenContract.symbol().then(rlt => {setSymbol(rlt)}).catch(err => console.log(err));
            tokenContract.decimals().then(rlt => {setDecimals(rlt)}).catch(err => console.log(err));
        }
    }, [tokenAddy]);
    return (
        <div className="modal" tabIndex="-1" id="tokenListModal">
            <div className="modal-dialog modal-dialog-centered">
                <div className="modal-content">
                    <div className="modal-header">
                        <h5 className="modal-title">Token List</h5>
                        <button type="button" className="btn-close" data-bs-dismiss="modal" aria-label="Close"><i className="fas fa-times"></i></button>
                    </div>
                    <div className="modal-body">
                        <input
                            type="text" placeholder="Token Address"
                            className="form-control approve-input"
                            value={tokenAddy}
                            aria-describedby="approve-contract-address"
                            onChange={() => {setTokenAddy(event.target.value)}}
                            style={{borderColor: "#2fbff3"}}
                            required
                        />
                        <div className="table-overflow mt-4">
                            <table className="transactions-table" style={{color: "white", border: "1px solid #2fbff3"}}>
                                <thead>
                                    <tr>
                                        <th>
                                        Address
                                        </th>
                                        <th>
                                        Name
                                        </th>
                                        <th>
                                        Symbol
                                        </th>
                                        <th>
                                        Decimals
                                        </th>
                                        <th>
                                        Action
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {tokens.map((token, idx) => {
                                        return <tr key={idx}>
                                            <td>{token.address}</td>
                                            <td>{token.name}</td>
                                            <td>{token.symbol}</td>
                                            <td>{token.decimals}</td>
                                            <td><button onClick={() => {onDeleteToken(token.address)}}><i className="fas fa-times"></i></button></td>
                                        </tr>
                                    })}
                                    {
                                        tokenAddy && name && !tokens.find(token => token.address == tokenAddy) ? 
                                            <tr>
                                                <td>{tokenAddy}</td>
                                                <td>{name}</td>
                                                <td>{symbol}</td>
                                                <td>{decimals}</td>
                                                <td><button onClick={() => {onAddToken(tokenAddy.toLowerCase(), name, symbol, decimals)}}><i className="fas fa-plus"></i></button></td>
                                            </tr>
                                        :
                                            <></>
                                    }
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}