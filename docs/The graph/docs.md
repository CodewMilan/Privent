Querying from an Application
Learn how to query The Graph from your application.

Getting GraphQL Endpoints
During the development process, you will receive a GraphQL API endpoint at two different stages: one for testing in Subgraph Studio, and another for making queries to The Graph Network in production.

Subgraph Studio Endpoint
After deploying your Subgraph to 
Subgraph Studio, you will receive an endpoint that looks like this:


https://api.studio.thegraph.com/query/<ID>/<SUBGRAPH_NAME>/<VERSION>
This endpoint is intended for testing purposes only and is rate-limited.

The Graph Network Endpoint
After publishing your Subgraph to the network, you will receive an endpoint that looks like this: :


https://gateway.thegraph.com/api/<API_KEY>/subgraphs/id/<SUBGRAPH_ID>
This endpoint is intended for active use on the network. It allows you to use various GraphQL client libraries to query the Subgraph and populate your application with indexed data.

Using Popular GraphQL Clients
Graph Client
The Graph is providing its own GraphQL client, graph-client that supports unique features such as:

Cross-chain Subgraph Handling: Querying from multiple Subgraphs in a single query
Automatic Block Tracking⁠
Automatic Pagination⁠
Fully typed result
Note: graph-client is integrated with other popular GraphQL clients such as Apollo and URQL, which are compatible with environments such as React, Angular, Node.js, and React Native. As a result, using graph-client will provide you with an enhanced experience for working with The Graph.

Fetch Data with Graph Client
Let’s look at how to fetch data from a Subgraph with graph-client:

Step 1
Install The Graph Client CLI in your project:


yarn add -D @graphprotocol/client-cli
# or, with NPM:
npm install --save-dev @graphprotocol/client-cli
Step 2
Define your query in a .graphql file (or inlined in your .js or .ts file):


query ExampleQuery {
  # this one is coming from compound-v2
  markets(first: 7) {
    borrowRate
    cash
    collateralFactor
  }
  # this one is coming from uniswap-v2
  pair(id: "0x00004ee988665cdda9a1080d5792cecd16dc1220") {
    id
    token0 {
      id
      symbol
      name
    }
    token1 {
      id
      symbol
      name
    }
  }
}
Step 3
Create a configuration file (called .graphclientrc.yml) and point to your GraphQL endpoints provided by The Graph, for example:


# .graphclientrc.yml
sources:
  - name: uniswapv2
    handler:
      graphql:
        endpoint: https://gateway.thegraph.com/api/<API_KEY>/subgraphs/id/<SUBGRAPH_ID>
  - name: compoundv2
    handler:
      graphql:
        endpoint: https://gateway.thegraph.com/api/<API_KEY>/subgraphs/id/<SUBGRAPH_ID>
documents:
  - ./src/example-query.graphql
Step 4
Run the following The Graph Client CLI command to generate typed and ready to use JavaScript code:


graphclient build
Step 5
Update your .ts file to use the generated typed GraphQL documents:


import React, { useEffect } from 'react'
// ...
// we import types and typed-graphql document from the generated code (`..graphclient/`)
import { ExampleQueryDocument, ExampleQueryQuery, execute } from '../.graphclient'
function App() {
  const [data, setData] = React.useState<ExampleQueryQuery>()
  useEffect(() => {
    execute(ExampleQueryDocument, {}).then((result) => {
      setData(result?.data)
    })
  }, [setData])
  return (
    <div className="App">
      <header className="App-header">
        <img src={logo} className="App-logo" alt="logo" />
        <p>Graph Client Example</p>
        <fieldset>
          {data && (
            <form>
              <label>Data</label>
              <br />
              <textarea value={JSON.stringify(data, null, 2)} readOnly rows={25} />
            </form>
          )}
        </fieldset>
      </header>
    </div>
  )
}
export default App
Important Note: graph-client is perfectly integrated with other GraphQL clients such as Apollo client, URQL, or React Query; you can 
find examples in the official repository⁠. However, if you choose to go with another client, keep in mind that you won’t be able to use Cross-chain Subgraph Handling or Automatic Pagination, which are core features for querying The Graph.

Apollo Client
Apollo client⁠ is a common GraphQL client on front-end ecosystems. It’s available for React, Angular, Vue, Ember, iOS, and Android.

Although it’s the heaviest client, it has many features to build advanced UI on top of GraphQL:

Advanced error handling
Pagination
Data prefetching
Optimistic UI
Local state management
Fetch Data with Apollo Client
Let’s look at how to fetch data from a Subgraph with Apollo client:

Step 1
Install @apollo/client and graphql:


npm install @apollo/client graphql
Step 2
Query the API with the following code:


import { ApolloClient, InMemoryCache, gql } from '@apollo/client'
const APIURL = 'https://gateway.thegraph.com/api/<API_KEY>/subgraphs/id/<SUBGRAPH_ID>'
const tokensQuery = `
  query {
    tokens {
      id
      tokenID
      contentURI
      metadataURI
    }
  }
`
const client = new ApolloClient({
  uri: APIURL,
  cache: new InMemoryCache(),
})
client
  .query({
    query: gql(tokensQuery),
  })
  .then((data) => console.log('Subgraph data: ', data))
  .catch((err) => {
    console.log('Error fetching data: ', err)
  })
Step 3
To use variables, you can pass in a variables argument to the query:


const tokensQuery = `
  query($first: Int, $orderBy: BigInt, $orderDirection: String) {
    tokens(
      first: $first, orderBy: $orderBy, orderDirection: $orderDirection
    ) {
      id
      tokenID
      contentURI
      metadataURI
    }
  }
`
client
  .query({
    query: gql(tokensQuery),
    variables: {
      first: 10,
      orderBy: 'createdAtTimestamp',
      orderDirection: 'desc',
    },
  })
  .then((data) => console.log('Subgraph data: ', data))
  .catch((err) => {
    console.log('Error fetching data: ', err)
  })
URQL Overview
URQL⁠ is available within Node.js, React/Preact, Vue, and Svelte environments, with some more advanced features:

Flexible cache system
Extensible design (easing adding new capabilities on top of it)
Lightweight bundle (~5x lighter than Apollo Client)
Support for file uploads and offline mode
Fetch data with URQL
Let’s look at how to fetch data from a Subgraph with URQL:

Step 1
Install urql and graphql:


npm install urql graphql
Step 2
Query the API with the following code:


import { createClient } from 'urql'
const APIURL = 'https://gateway.thegraph.com/api/<API_KEY>/subgraphs/id/<SUBGRAPH_ID>'
const tokensQuery = `
  query {
    tokens {
      id
      tokenID
      contentURI
      metadataURI
    }
  }
`
const client = createClient({
  url: APIURL,
})
const data = await client.query(tokensQuery).toPromise()





GraphQL API
Explore the GraphQL Query API for interacting with Subgraphs on The Graph Network.

GraphQL⁠ is a query language for APIs and a runtime for executing those queries with existing data.

The Graph uses GraphQL to query Subgraphs.

Core Concepts
Entities
What they are: Persistent data objects defined with @entity in your schema
Key requirement: Must contain id: ID! as primary identifier
Usage: Foundation for all query operations
Schema
Purpose: Blueprint defining the data structure and relationships using GraphQL 
IDL⁠
Key characteristics:
Auto-generates query endpoints
Read-only operations (no mutations)
Defines entity interfaces and derived fields
Query Structure
GraphQL queries in The Graph target entities defined in the Subgraph schema. Each Entity type generates corresponding entity and entities fields on the root Query type.

Note: The query keyword is not required at the top level of GraphQL queries.

Single Entity Queries Example
Query for a single Token entity:


{
  token(id: "1") {
    id
    owner
  }
}
Note: Single entity queries require the id parameter as a string.

Collection Queries Example
Query format for all Token entities:


{
  tokens {
    id
    owner
  }
}
Sorting Example
Collection queries support the following sort parameters:

orderBy: Specifies the attribute for sorting
orderDirection: Accepts asc (ascending) or desc (descending)
Standard Sorting Example

{
  tokens(orderBy: price, orderDirection: asc) {
    id
    owner
  }
}
Nested Entity Sorting Example

{
  tokens(orderBy: owner__name, orderDirection: asc) {
    id
    owner {
      name
    }
  }
}
Note: Nested sorting supports one-level-deep String or ID types on @entity and @derivedFrom fields.

Pagination Example
When querying a collection, it is best to:

Use the first parameter to paginate from the beginning of the collection.
The default sort order is by ID in ascending alphanumeric order, not by creation time.
Use the skip parameter to skip entities and paginate. For instance, first:100 shows the first 100 entities and first:100, skip:100 shows the next 100 entities.
Avoid using skip values in queries because they generally perform poorly. To retrieve a large number of items, it’s best to page through entities based on an attribute as shown in the previous example above.
Standard Pagination Example

{
  tokens(first: 10) {
    id
    owner
  }
}
Offset Pagination Example

{
  tokens(first: 10, skip: 10) {
    id
    owner
  }
}
Cursor-based Pagination Example

query manyTokens($lastID: String) {
  tokens(first: 1000, where: { id_gt: $lastID }) {
    id
    owner
  }
}
Filtering
The where parameter filters entities based on specified conditions.

Basic Filtering Example

{
  challenges(where: { outcome: "failed" }) {
    challenger
    outcome
    application {
      id
    }
  }
}
Numeric Comparison Example

{
  applications(where: { deposit_gt: "10000000000" }) {
    id
    whitelisted
    deposit
  }
}
Block-based Filtering Example

{
  applications(where: { _change_block: { number_gte: 100 } }) {
    id
    whitelisted
    deposit
  }
}
Nested Entity Filtering Example

{
  challenges(where: { application_: { id: 1 } }) {
    challenger
    outcome
    application {
      id
    }
  }
}
Logical Operators
AND Operations Example
The following example filters for challenges with outcome succeeded and number greater than or equal to 100.


{
  challenges(where: { and: [{ number_gte: 100 }, { outcome: "succeeded" }] }) {
    challenger
    outcome
    application {
      id
    }
  }
}
Syntactic sugar: You can simplify the above query by removing the and operator and by passing a sub-expression separated by commas.


{
  challenges(where: { number_gte: 100, outcome: "succeeded" }) {
    challenger
    outcome
    application {
      id
    }
  }
}
OR Operations Example

{
  challenges(where: { or: [{ number_gte: 100 }, { outcome: "succeeded" }] }) {
    challenger
    outcome
    application {
      id
    }
  }
}
Global filter parameter:


_change_block(number_gte: Int)
Time-travel Queries Example
Queries support historical state retrieval using the block parameter:

number: Integer block number
hash: String block hash
Note: The current implementation is still subject to certain limitations that might violate these guarantees. The implementation can not always tell that a given block hash is not on the main chain at all, or if a query result by a block hash for a block that is not yet considered final could be influenced by a block reorganization running concurrently with the query. They do not affect the results of queries by block hash when the block is final and known to be on the main chain. 
This issue⁠ explains what these limitations are in detail.

Block Number Query Example

{
  challenges(block: { number: 8000000 }) {
    challenger
    outcome
    application {
      id
    }
  }
}
Block Hash Query Example

{
  challenges(block: { hash: "0x5a0b54d5dc17e0aadc383d2db43b0a0d3e029c4c" }) {
    challenger
    outcome
    application {
      id
    }
  }
}
Full-Text Search Example
Full-text search query fields provide an expressive text search API that can be added to the Subgraph schema and customized. Refer to 
Defining Full-text Search Fields to add full-text search to your Subgraph.

Full-text search queries have one required field, text, for supplying search terms. Several special full-text operators are available to be used in this text search field.

Full-text search fields use the required text parameter with the following operators:

Operator	Symbol	Description
And	&	Matches entities containing all terms
Or	|	Return all entities with a match from any of the provided terms
Follow by	<->	Matches terms with specified distance
Prefix	:*	Matches word prefixes (minimum 2 characters)
Search Examples
OR operator:


{
  blogSearch(text: "anarchism | crumpets") {
    id
    title
    body
    author
  }
}
“Follow” by operator:


{
  blogSearch(text: "decentralized <-> philosophy") {
    id
    title
    body
    author
  }
}
Combined operators:


{
  blogSearch(text: "lou:* <-> music") {
    id
    title
    body
    author
  }
}
Schema Definition
Entity types require:

GraphQL Interface Definition Language (IDL) format
@entity directive
ID field
Subgraph Metadata Example
The _Meta_ object provides subgraph metadata:


{
  _meta(block: { number: 123987 }) {
    block {
      number
      hash
      timestamp
    }
    deployment
    hasIndexingErrors
  }
}
Metadata fields:

deployment: IPFS CID of the subgraph.yaml
block: Latest block information
hasIndexingErrors: Boolean indicating past indexing errors
Note: When writing queries, it is important to consider the performance impact of using the or operator. While or can be a useful tool for broadening search results, it can also have significant costs. One of the main issues with or is that it can cause queries to slow down. This is because or requires the database to scan through multiple indexes, which can be a time-consuming process. To avoid these issues, it is recommended that developers use and operators instead of or whenever possible. This allows for more precise filtering and can lead to faster, more accurate queries.

GraphQL Filter Operators Reference
This table explains each filter operator available in The Graph’s GraphQL API. These operators are used as suffixes to field names when filtering data using the where parameter.

Operator	Description	Example
_	Matches entities where the specified field equals another entity	{ where: { owner_: { name: "Alice" } } }
_not	Negates the specified condition	{ where: { active_not: true } }
_gt	Greater than (>)	{ where: { price_gt: "100" } }
_lt	Less than (\<)	{ where: { price_lt: "100" } }
_gte	Greater than or equal to (>=)	{ where: { price_gte: "100" } }
_lte	Less than or equal to (\<=)	{ where: { price_lte: "100" } }
_in	Value is in the specified array	{ where: { category_in: ["Art", "Music"] } }
_not_in	Value is not in the specified array	{ where: { category_not_in: ["Art", "Music"] } }
_contains	Field contains the specified string (case-sensitive)	{ where: { name_contains: "token" } }
_contains_nocase	Field contains the specified string (case-insensitive)	{ where: { name_contains_nocase: "token" } }
_not_contains	Field does not contain the specified string (case-sensitive)	{ where: { name_not_contains: "test" } }
_not_contains_nocase	Field does not contain the specified string (case-insensitive)	{ where: { name_not_contains_nocase: "test" } }
_starts_with	Field starts with the specified string (case-sensitive)	{ where: { name_starts_with: "Crypto" } }
_starts_with_nocase	Field starts with the specified string (case-insensitive)	{ where: { name_starts_with_nocase: "crypto" } }
_ends_with	Field ends with the specified string (case-sensitive)	{ where: { name_ends_with: "Token" } }
_ends_with_nocase	Field ends with the specified string (case-insensitive)	{ where: { name_ends_with_nocase: "token" } }
_not_starts_with	Field does not start with the specified string (case-sensitive)	{ where: { name_not_starts_with: "Test" } }
_not_starts_with_nocase	Field does not start with the specified string (case-insensitive)	{ where: { name_not_starts_with_nocase: "test" } }
_not_ends_with	Field does not end with the specified string (case-sensitive)	{ where: { name_not_ends_with: "Test" } }
_not_ends_with_nocase	Field does not end with the specified string (case-insensitive)	{ where: { name_not_ends_with_nocase: "test" } }
Notes
Type support varies by operator. For example, Boolean only supports _not, _in, and _not_in.
The _ operator is only available for object and interface types.
String comparison operators are especially useful for text fields.
Numeric comparison operators work with both number and string-encoded number fields.
Use these operators in combination with logical operators (and, or) for complex filtering.
Validation
Graph Node implements 
specification-based⁠ validation of the GraphQL queries it receives using 
graphql-tools-rs⁠, which is based on the 
graphql-js reference implementation⁠. Queries which fail a validation rule do so with a standard error - visit the 
GraphQL spec⁠ to learn more.





The Graph Market
The Graph Market⁠ is a data services marketplace where you can provision an API key and stream on-chain data through Substreams and Firehose, along with the Token API, Hosted Sinks, and other services.

Overview
The Graph Market lets you find a provider for the network you’re building on, create an API key, and start consuming data — without providing personal information. From a single dashboard you can manage keys, monitor usage, and deploy Hosted Sinks.

The platform serves several data services:

Substreams & Firehose: High-throughput, parallelized streaming of blockchain data.
Token API: Live and historical token data (balances, transfers, holders, and DEX swaps) across multiple chains.
Hosted Sinks: Managed sink deployments that write Substreams output to a destination for you.
Subgraphs, JSON-RPC, and Webhooks: Additional data services available across supported networks.
Get Started
Create an Account
Go to 
thegraph.market⁠ and sign in. Once you’re in, you’ll land on the Dashboard, which summarizes your usage for Substreams & Firehose and the Token API, your Hosted Sinks, and your API keys.

Create an API Key
From the Dashboard or the API keys page, select Create new key and give it a name (for example, my-substreams-key). Each key exposes two credentials:

API Key: An identifier (for example, server_1...) used for services that authenticate with a key.
API Token (JWT): A JSON Web Token used to authenticate Substreams and Firehose requests.
For security, the API token is hidden by default. Use the reveal (eye) icon to display it, then copy and store it securely. You can rotate or delete a key at any time from the API keys page.

Note: Treat your API token like a password. Don’t commit it to source control or expose it in client-side code.

Use Your Key with Substreams
Authenticate the CLI
Substreams authenticates with the JWT token from your API key. Export it as an environment variable so the CLI can pick it up automatically:


export SUBSTREAMS_API_TOKEN="<YOUR-JWT-TOKEN>"
Replace <YOUR-JWT-TOKEN> with the API token you copied from The Graph Market.

Choose an Endpoint
Substreams runs against a provider endpoint for your target network, passed to the CLI with the -e flag. Endpoints follow the pattern {network}.{provider}.io:443. A few examples:

Network	Endpoint
Ethereum Mainnet	mainnet.eth.streamingfast.io:443
Solana Mainnet	mainnet.sol.streamingfast.io:443
Base Mainnet	base-mainnet.streamingfast.io:443
Arbitrum One	arb-one.streamingfast.io:443
Polygon Mainnet	polygon.streamingfast.io:443
Note: Select your network on The Graph Market to see the providers and endpoints available for it. For the full, up-to-date list, see 
Chains & Endpoints⁠ on the Substreams docs.

Run a Substreams
With your token exported, run a package against the endpoint for your network:


substreams gui \
  -e mainnet.eth.streamingfast.io:443 \
  ethereum-common@v0.3.1 \
  all_events \
  --start-block=15000000
A successful run confirms your key is authenticated. To find ready-to-use packages, browse the 
Substreams Registry⁠.

Deploy a Hosted Sink
If you’d rather have your data written to a destination automatically, use Hosted Sinks. From the Sinks page, select New Sink, then point it at a Substreams package and configure the destination. The Dashboard tracks each deployment’s status (deployed, syncing, error, or stopped). To learn more about sink types, see 
Sink your Substreams.

Use the Token API
The Token API uses the same API token for authentication. Send it as a bearer token against the Token API base URL:


curl --request GET \
  --url "https://token-api.thegraph.com/v1/evm/balances?network=mainnet&address=0x2a0c0dbecc7e4d658f48e01e3fa353f44050c208" \
  --header 'Accept: application/json' \
  --header 'Authorization: Bearer <YOUR-JWT-TOKEN>'
See the 
Token API Quick Start for the full list of endpoints.

Plans and Usage
The Graph Market offers a Free plan for both Substreams & Firehose and the Token API, with monthly included usage (for example, egress bytes and processed blocks for Substreams & Firehose, and request counts for the Token API). The Dashboard shows your consumption against these limits. Review the 
Pricing⁠ page for current plan tiers and included quotas.

Additional Resources
The Graph Market⁠ — provision keys and manage data services.
Substreams Quick Start — start streaming on-chain data.
Sink your Substreams — send data to a destination.
Chains & Endpoints⁠ — provider endpoints per network.
Token API Quick Start — access token data.