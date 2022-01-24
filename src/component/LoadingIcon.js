import './LoadingIcon.css';

export default function LoadingIcon({...rest}) {
    console.log(rest);
    return (<>
    <div className="lds-spinner" {...rest}><div></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div></div>
    </>)
}