export default function TransactionList({ data, ethPrice }) {
    return(
        <section id="transactions">
            <h4 className="section-title" data-aos="fade-right"><i className="fas fa-list-ul me-3"></i>Transactions</h4>
            <div className="table-overflow mt-4" data-aos="fade-up">
                <table className="transactions-table">
                    <thead>
                        <tr>
                            <th className="wallet">
                            <i className="fas fa-wallet"></i> Wallet
                            </th>
                            <th className="date">
                            <i className="fas fa-clock"></i> Date
                            </th>
                            <th className="token">
                            <i className="fas fa-sitemap"></i> Token
                            </th>
                            <th className="sold">
                            <i className="fas fa-exchange-alt"></i> Amount (In) 
                            </th>
                            <th className="received">
                            <i className="fas fa-exchange-alt"></i> Amount (Out) 
                            </th>

                        </tr>
                    </thead>
                    <tbody>
                        {
                            data && data.map((tx, idx) => {
                                return <tr key={idx}>
                                    <td className="wallet">
                                        {tx.accountName}
                                    </td>
                                    <td className="date">
                                        {tx.time}
                                    </td>
                                    <td className="token">
                                        {tx.tokenName}
                                    </td>
                                    <td className="sold">
                                        -{(tx.amountIn*1).toFixed(6)} {tx.tokenSymbol}
                                    </td>
                                    <td className="received">
                                        <img src="resources/images/svg/ETH-circle-icon.svg"/>+{(tx.amountOut*1).toFixed(6)} (${(tx.amountOut*ethPrice).toFixed(1)})
                                    </td>
                                    
                                </tr>
                            })
                        }
                        {
                            !data.length && <tr className="text-center"><td colSpan={5}>No transactions</td></tr>
                        }
                        
                    </tbody>
                </table>
            </div>
        </section>
    )
}