import { gql } from 'graphql-request';

export default gql`
query MyQuery($addresses: [String!]) {
    ethereum(network: ethereum) {
      address(address: {in: $addresses}) {
        balances {
          value
          currency {
            address
            decimals
            name
            symbol
            tokenType
          }
        }
        address
      }
    }
  }
  
`
