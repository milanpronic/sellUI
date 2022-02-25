import { useEffect, useState } from 'react';
import {ethers} from 'ethers';

export default function UnitConvert() {
    const [wei, setWei] = useState('');
    const [gwei, setGwei] = useState('');
    const [ether, setEther] = useState('');

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
        <>
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
        </>
    )
}