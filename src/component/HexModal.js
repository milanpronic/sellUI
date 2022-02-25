import { useEffect, useState } from 'react';
import {ethers} from 'ethers';
const abiCoder = new ethers.utils.AbiCoder();

export default function HexModal() {
    const [amountIn, setAmountIn] = useState("");
    const [amountOutMin, setAmountOutMin] = useState("");
    const [path, setPath] = useState("");
    const [deadline, setDeadline] = useState("");
    const [recipient, setRecipient] = useState("");
    const [hex, setHex] = useState("");

    useEffect(() => {
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

    const onGenerateClick = () => {
        const paraHex = abiCoder.encode(["uint", "uint", "address[]", "address", "uint"], [amountIn, amountOutMin, JSON.parse(path), recipient, deadline]);
        localStorage.setItem("generate_data", JSON.stringify({amountIn, amountOutMin, path: JSON.parse(path), recipient, deadline, hex: "0x791ac947" + paraHex.substr(2)}));
        setHex("0x791ac947" + paraHex.substr(2));
    }
    
    return (
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
    )
}