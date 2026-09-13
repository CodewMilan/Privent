---
description: Per-account resolver with role-based access control, record aliasing, and DNS resolution
---

import { Card } from '../../components/ui/Card'
import { FrenCallout } from '../../components/ensv2/FrenCallout'
import { ResourceCalculator } from '../../components/ensv2/ResourceCalculator'
import { RoleBitmapComposer } from '../../components/ensv2/RoleBitmapComposer'
import { ContractReference } from '../../components/ensv2/ContractReference'

# Permissioned Resolver

In ENSv1, most names shared a single [Public Resolver](/resolvers/public) contract. In ENSv2, **each account gets its own resolver instance**, deployed as a UUPS-upgradeable proxy. All names owned by the same account share one resolver. This gives name owners fine-grained control over who can set which records, and enables new features like record aliasing.

<FrenCallout fren="lili" variant="tip">
The contracts and interfaces described here are **not yet final** and may change prior to mainnet deployment.
</FrenCallout>

## What Changed from ENSv1

| Feature         | ENSv1 Public Resolver      | ENSv2 Permissioned Resolver                                               |
| --------------- | -------------------------- | ------------------------------------------------------------------------- |
| Deployment      | Single shared contract     | Per-account proxy instances                                               |
| Permissions     | Owner controls all records | Per-record-type roles via [EAC](/ensv2/enhanced-access-control) |
| Aliasing        | Not supported              | Built-in name aliasing with cycle protection                              |
| Record clearing | `clearRecords()` by owner  | Record versioning                                                         |
| Upgradeability  | Not upgradeable            | UUPS proxy pattern                                                        |

## Supported Record Types

The Permissioned Resolver supports all standard ENS record types:

| Record               | Getter                                  | Setter                                      | Standard                                            |
| -------------------- | --------------------------------------- | ------------------------------------------- | --------------------------------------------------- |
| Address (ETH)        | `addr(bytes32 node)`                    | `setAddr(bytes32 node, address)`            | [ENSIP-1](/ensip/1)                                 |
| Address (multichain) | `addr(bytes32 node, uint256 coinType)`  | `setAddr(bytes32 node, uint256, bytes)`     | [ENSIP-9](/ensip/9)                                 |
| Text                 | `text(bytes32 node, string key)`        | `setText(bytes32 node, string, string)`     | [ENSIP-5](/ensip/5)                                 |
| Content hash         | `contenthash(bytes32 node)`             | `setContenthash(bytes32 node, bytes)`       | [ENSIP-7](/ensip/7)                                 |
| Name (reverse)       | `name(bytes32 node)`                    | `setName(bytes32 node, string)`             | [EIP-181](https://eips.ethereum.org/EIPS/eip-181)   |
| Public key           | `pubkey(bytes32 node)`                  | `setPubkey(bytes32 node, bytes32, bytes32)` | [EIP-619](https://eips.ethereum.org/EIPS/eip-619)   |
| ABI                  | `ABI(bytes32 node, uint256)`            | `setABI(bytes32 node, uint256, bytes)`      | [EIP-205](https://eips.ethereum.org/EIPS/eip-205)   |
| Interface            | `interfaceImplementer(bytes32, bytes4)` | `setInterface(bytes32, bytes4, address)`    | [ENSIP-8](/ensip/8) |
| Data                 | `data(bytes32 node, string key)`        | `setData(bytes32 node, string, bytes)`      | [ENSIP-24](/ensip/24)                               |

## EAC Integration

All permissions are managed through [Enhanced Access Control](/ensv2/enhanced-access-control).

### Roles

Each record type has its own role, allowing you to delegate specific record-setting permissions to different accounts:

| Role                   | Value      | Scope                  | Purpose                  |
| ---------------------- | ---------- | ---------------------- | ------------------------ |
| `ROLE_SET_ADDR`        | `1 << 0`   | root, name, or record  | Set address records      |
| `ROLE_SET_TEXT`        | `1 << 4`   | root, name, or record  | Set text records         |
| `ROLE_SET_CONTENTHASH` | `1 << 8`   | root or name           | Set content hash         |
| `ROLE_SET_PUBKEY`      | `1 << 12`  | root or name           | Set public key           |
| `ROLE_SET_ABI`         | `1 << 16`  | root or name           | Set ABI data             |
| `ROLE_SET_INTERFACE`   | `1 << 20`  | root or name           | Set interface records    |
| `ROLE_SET_NAME`        | `1 << 24`  | root or name           | Set reverse name         |
| `ROLE_SET_ALIAS`       | `1 << 28`  | root                   | Set name aliases         |
| `ROLE_CLEAR`           | `1 << 32`  | root or name           | Clear all records        |
| `ROLE_SET_DATA`        | `1 << 36`  | root, name, or record  | Set data records         |
| `ROLE_UPGRADE`         | `1 << 124` | root                   | Authorize proxy upgrades |

Each role has a corresponding admin role at `role << 128` (e.g., `ROLE_SET_TEXT_ADMIN = (1 << 4) << 128`). In TypeScript, use `1n << 4n` for the bigint equivalent.

<FrenCallout fren="earl" variant="note" title="Default Deployment Roles">
When deployed through the [Verifiable Factory](/ensv2/verifiable-factory), the deployer chooses the initial permissions: `initialize(admin, roleBitmap, ...)` grants exactly the bitmap passed. The standard ENS tooling passes **every role and its admin counterpart** on `ROOT_RESOURCE`, giving the deployer full control over all record types, aliasing, clearing, and upgrades.
</FrenCallout>

### Role Bitmap Composer

<FrenCallout fren="peanut" variant="tip" title="Interactive Widget">
Select roles to compose a bitmap value for use with `authorizeNameRoles`.
</FrenCallout>

<Card>
  <RoleBitmapComposer contract="resolver" />
</Card>

### Granting and Revoking Roles

Use the `authorize*` functions below to manage permissions (pass `true` to grant, `false` to revoke).

<FrenCallout fren="bittu" variant="tip">
For root-level (`ROOT_RESOURCE`) permissions, you can also use `grantRootRoles()` / `revokeRootRoles()` inherited from [EAC](/ensv2/enhanced-access-control). `grantRoles()` and `revokeRoles()` are disabled on the Permissioned Resolver; use the `authorize*` functions for name and record-level permissions.
</FrenCallout>

| Function | Scope | Grants/revokes |
|----------|-------|----------------|
| `authorizeNameRoles(toName, roleBitmap, account, grant)` | Name-level | Any role(s) on a specific name |
| `authorizeTextRoles(toName, key, account, grant)` | Record-level | `ROLE_SET_TEXT` for a specific text key |
| `authorizeDataRoles(toName, key, account, grant)` | Record-level | `ROLE_SET_DATA` for a specific data key |
| `authorizeAddrRoles(toName, coinType, account, grant)` | Record-level | `ROLE_SET_ADDR` for a specific coin type |

All four functions take a DNS-encoded name (`bytes`) as the first parameter (`toName`). For example, `authorizeNameRoles(toName, ROLE_SET_TEXT, account, true)` grants the account permission to set any text key on that name, while `authorizeTextRoles(toName, "avatar", account, true)` restricts it to only the `avatar` key. To revoke either, make the same call with `false`.

`ROLE_SET_ADDR`, `ROLE_SET_TEXT`, and `ROLE_SET_DATA` support both levels of scoping. A name-level grant (via `authorizeNameRoles`) covers all keys or coin types on that name. A record-level grant (via `authorizeTextRoles`, `authorizeDataRoles`, or `authorizeAddrRoles`) covers only the specific key or coin type. When checking permissions, the resolver allows the action if the account has the role at either scope, so a name-level grant is a superset of any record-level grant.

### Resource Scheme

<FrenCallout fren="bittu" variant="tip" title="Developer tip">
This section explains how [EAC resources](/ensv2/enhanced-access-control#resources) are computed internally. You don't need this for normal use. The `authorize*` functions handle resource computation automatically.
</FrenCallout>

Unlike the registry's labelhash-based resources, resolver resources are opaque hashes with no version structure, and the [anyId polymorphism](/ensv2/mutable-token-ids#anyid-polymorphism) used in the registry does not apply here. The resolver computes each EAC resource as a hash of the name's namehash and a record-type identifier:

```solidity
resource = keccak256(node, part)
```

Where `node` is the namehash of the full name (e.g., `namehash("alice.eth")`) and `part` is computed via `partHash`:

| Record type | Part computation |
|-------------|-----------------|
| Name-level (any record) | `bytes32(0)` |
| Text key | `partHash(key)` = `keccak256(bytes(key))` |
| Data key | `partHash(key)` = `keccak256(bytes(key))` |
| Coin type | `partHash(coinType)` = `keccak256(abi.encode(coinType))` |

When checking permissions, the resolver looks across four combinations of `node` and `part` and allows the action if any grant the required role. Using the shorthand `resource(node, part)` for `keccak256(node, part)`:

|                   | Any record                                         | Specific record            |
| ----------------- | -------------------------------------------------- | -------------------------- |
| **Any name**      | `ROOT_RESOURCE` (when both node and part are zero) | `resource(0, part)`        |
| **Specific name** | `resource(namehash, 0)`                            | `resource(namehash, part)` |

`authorizeNameRoles` sets the role on `resource(namehash, 0)` (second row, first column), while `authorizeTextRoles` with a specific key sets it on `resource(namehash, partHash(key))` (second row, second column). A role granted at `ROOT_RESOURCE` covers all four cells.

### Resource Calculator

<FrenCallout fren="peanut" variant="tip" title="Interactive Widget">
Compute the EAC resource for any name and record type.
</FrenCallout>

<Card>
  <ResourceCalculator />
</Card>

## Aliasing

ENSv2 introduces **record aliasing**. Within a single resolver instance, you can make one name's records point to another name's records, so they always resolve identically without duplicating data.

```mermaid
flowchart LR
    from["wallet.eth\n(alias)"]
    to["alice.eth\n(canonical)"]
    from -->|"resolves to"| to
    query["Query: addr(wallet.eth)"]
    result["Result: addr(alice.eth)"]
    query -.-> from
    to -.-> result
```

### Setting an Alias

Both `setAlias` parameters are DNS-encoded names. The alias and target must use the same resolver instance:

```ts [Viem]
import { createWalletClient, http, toHex } from 'viem'
import { packetToBytes } from 'viem/ens'
import { mainnet } from 'viem/chains'

const wallet = createWalletClient({ chain: mainnet, transport: http() })

// Make wallet.eth resolve to the same records as alice.eth
await wallet.writeContract({
  address: resolverAddress,
  abi: permissionedResolverAbi,
  functionName: 'setAlias',
  args: [
    toHex(packetToBytes('wallet.eth')),  // from: the alias name
    toHex(packetToBytes('alice.eth')),   // to: the canonical name
  ],
})

// To remove an alias, set the target to empty bytes ('0x').
// Storing empty bytes restores the no-alias state. Do not use '0x00':
// that is the DNS encoding of the root name and would set an alias
// instead of removing one.
await wallet.writeContract({
  address: resolverAddress,
  abi: permissionedResolverAbi,
  functionName: 'setAlias',
  args: [toHex(packetToBytes('wallet.eth')), '0x'],
})
```

<FrenCallout fren="bittu" variant="note">
Aliasing only works through the Universal Resolver's `resolve()` function. Calling `addr()` or `text()` directly on the resolver contract with an aliased name's namehash will return empty results, because the alias rewrite is part of the extended resolver resolution flow.
</FrenCallout>

`setAlias` requires `ROLE_SET_ALIAS`, which is a root-only role. This ensures only the resolver's admin can set up aliases. To alias names that were registered with separate resolvers, first point them to the same resolver via `setResolver` on the registry.

### Cycle Protection

The resolver detects self-referential aliases (A aliased to itself) and applies them only once. However, longer alias cycles (e.g., A -> B -> A or A -> B -> C -> A) are **not** detected and will cause an out-of-gas revert during resolution. Avoid creating circular alias chains.

### Use Cases

- **Multiple domains, same records**: point `wallet.eth`, `brand.eth`, and `company.eth` to the same resolver, then alias them so they share one set of records
- **Name migration**: alias an old name to a new one so existing references continue to work
- **Subname delegation**: let subnames of a parent (e.g., `pay.alice.eth`, `nft.alice.eth`) resolve to the parent's records without duplicating them

Note that aliasing at the resolver level is different from [namespace aliasing](/ensv2/registry-hierarchy#namespace-aliasing) at the registry level. Resolver aliasing shares records; registry aliasing shares entire namespaces.

## Record Versioning

The resolver supports record versioning. The `clearRecords(node)` function increments the version, effectively clearing all records at once without individual delete calls. This is useful when you want a clean slate, for example when transferring a name to a new owner.

## UUPS Upgradeability

Each resolver instance is a UUPS proxy pointing to a shared implementation contract. The `ROLE_UPGRADE` (root-only) controls who can upgrade the implementation. This means:

- All resolver instances share the same logic, keeping deployment costs low
- The implementation can be upgraded to support new record types in the future
- Individual name owners can upgrade their resolver if they hold the upgrade role

See [Verifiable Factory](/ensv2/verifiable-factory) for how resolver proxies are deployed.

## Code Examples

Each account deploys its own resolver instance. See [Deploying a Resolver Proxy](/ensv2/verifiable-factory#deploying-a-resolver-proxy) for a code example showing how to deploy a Permissioned Resolver through the Verifiable Factory. The examples below assume you already have a `resolverAddress`.

### Setting and Reading Records

The Permissioned Resolver implements the same record interfaces as ENSv1 resolvers (`addr`, `text`, `contenthash`, etc.), so existing viem patterns work unchanged. The only difference is that each account deploys its own resolver instance rather than sharing one:

```ts [Viem]
import { createPublicClient, createWalletClient, http, namehash } from 'viem'
import { normalize } from 'viem/ens'
import { mainnet } from 'viem/chains'

const client = createPublicClient({ chain: mainnet, transport: http() })
const wallet = createWalletClient({ chain: mainnet, transport: http() })

const name = normalize('alice.eth')
const node = namehash(name)

// Set an ETH address
await wallet.writeContract({
  address: resolverAddress,
  abi: permissionedResolverAbi,
  functionName: 'setAddr',
  args: [node, '0x1234...'],
})

// Set a text record
await wallet.writeContract({
  address: resolverAddress,
  abi: permissionedResolverAbi,
  functionName: 'setText',
  args: [node, 'avatar', 'https://example.com/avatar.png'],
})

// Read them back using viem's built-in ENS functions
const ethAddr = await client.getEnsAddress({ name })
const avatar = await client.getEnsText({ name, key: 'avatar' })
```

### Delegating a Single Text Key

A name owner can grant a dApp permission to set only a specific text record, for example allowing it to update the `avatar` key without giving access to any other records:

```ts [Viem]
import { createWalletClient, http, namehash, toHex } from 'viem'
import { packetToBytes } from 'viem/ens'
import { mainnet } from 'viem/chains'

const wallet = createWalletClient({ chain: mainnet, transport: http() })

// authorize* functions take DNS-encoded names; record setters take namehashes
const dnsName = toHex(packetToBytes('alice.eth'))
const node = namehash('alice.eth')

// Grant a dApp permission to set ONLY the "avatar" text key on alice.eth
await wallet.writeContract({
  address: resolverAddress,
  abi: permissionedResolverAbi,
  functionName: 'authorizeTextRoles',
  args: [dnsName, 'avatar', dappAddress, true],
})

// The dApp can now set the avatar record...
await dappWallet.writeContract({
  address: resolverAddress,
  abi: permissionedResolverAbi,
  functionName: 'setText',
  args: [node, 'avatar', 'https://example.com/avatar.png'],
})

// ...but attempting to set any other key will revert
// setText(node, 'description', '...') → reverts with EACUnauthorizedAccountRoles
```

To grant access to all text keys on a name (not just one), use `authorizeNameRoles` with `ROLE_SET_TEXT`:

```ts [Viem]
const ROLE_SET_TEXT = 1n << 4n

await wallet.writeContract({
  address: resolverAddress,
  abi: permissionedResolverAbi,
  functionName: 'authorizeNameRoles',
  args: [dnsName, ROLE_SET_TEXT, dappAddress, true],
})
```

### Revoking Permissions

To revoke a permission, call the same `authorize*` function with `false` as the last argument:

```ts [Viem]
// Revoke the dApp's permission to set the "avatar" text key
await wallet.writeContract({
  address: resolverAddress,
  abi: permissionedResolverAbi,
  functionName: 'authorizeTextRoles',
  args: [dnsName, 'avatar', dappAddress, false],
})

// Revoke name-level ROLE_SET_TEXT (all text keys)
await wallet.writeContract({
  address: resolverAddress,
  abi: permissionedResolverAbi,
  functionName: 'authorizeNameRoles',
  args: [dnsName, ROLE_SET_TEXT, dappAddress, false],
})
```

### Locking a Record Permanently

Because each role has a corresponding admin role, an owner can make a record type permanently immutable by revoking both the role and its admin from themselves. Without the admin role, nobody can grant the role back.

```ts [Viem]
import { createWalletClient, http, namehash } from 'viem'
import { mainnet } from 'viem/chains'

const wallet = createWalletClient({ chain: mainnet, transport: http() })
const node = namehash('alice.eth')

const ROLE_SET_CONTENTHASH = 1n << 8n
const ROLE_SET_CONTENTHASH_ADMIN = ROLE_SET_CONTENTHASH << 128n

// Set the content hash one final time
await wallet.writeContract({
  address: resolverAddress,
  abi: permissionedResolverAbi,
  functionName: 'setContenthash',
  args: [node, contenthashBytes], // your encoded content hash
})

// Permanently lock: revoke both the role and its admin in one call
await wallet.writeContract({
  address: resolverAddress,
  abi: permissionedResolverAbi,
  functionName: 'revokeRootRoles',
  args: [ROLE_SET_CONTENTHASH | ROLE_SET_CONTENTHASH_ADMIN, ownerAddress], // your address
})
// The content hash can never be changed again, even by the owner
```

<FrenCallout fren="earl" variant="warning">
This is irreversible. Once both a role and its admin are revoked, there is no way to restore the ability to modify that record type.
</FrenCallout>

### Clearing All Records

The `clearRecords` function increments the record version for a name, effectively clearing all records at once without individual delete calls. This is useful when transferring a name to a new owner or starting fresh:

```ts [Viem]
const node = namehash('alice.eth')

// Check the current version
const versionBefore = await client.readContract({
  address: resolverAddress,
  abi: permissionedResolverAbi,
  functionName: 'recordVersions',
  args: [node],
})

// Clear all records in one call
await wallet.writeContract({
  address: resolverAddress,
  abi: permissionedResolverAbi,
  functionName: 'clearRecords',
  args: [node],
})

// The version is incremented; all previous records now return empty
const versionAfter = await client.readContract({
  address: resolverAddress,
  abi: permissionedResolverAbi,
  functionName: 'recordVersions',
  args: [node],
})
// versionAfter === versionBefore + 1n
```

## Reference

### Write Functions

<ContractReference functions={[
  {
    name: 'setText',
    description: 'Set a text record. Requires ROLE_SET_TEXT.',
    params: [
      { name: 'node', type: 'bytes32', description: 'The namehash of the name' },
      { name: 'key', type: 'string', description: 'The text record key' },
      { name: 'value', type: 'string', description: 'The text record value' },
    ],
  },
  {
    name: 'setAddr',
    description: 'Set a multichain address record. Requires ROLE_SET_ADDR.',
    params: [
      { name: 'node', type: 'bytes32', description: 'The namehash of the name' },
      { name: 'coinType', type: 'uint256', description: 'The coin type (e.g. 60 for Ethereum)' },
      { name: 'addressBytes', type: 'bytes', description: 'The encoded address' },
    ],
  },
  {
    name: 'setAddr',
    description: 'Set the ETH address record (convenience overload for coin type 60).',
    params: [
      { name: 'node', type: 'bytes32', description: 'The namehash of the name' },
      { name: 'addr_', type: 'address', description: 'The Ethereum address' },
    ],
  },
  {
    name: 'setContenthash',
    description: 'Set the content hash. Requires ROLE_SET_CONTENTHASH.',
    params: [
      { name: 'node', type: 'bytes32', description: 'The namehash of the name' },
      { name: 'hash', type: 'bytes', description: 'The content hash' },
    ],
  },
  {
    name: 'setName',
    description: 'Set the reverse name. Requires ROLE_SET_NAME.',
    params: [
      { name: 'node', type: 'bytes32', description: 'The namehash of the name' },
      { name: 'primary', type: 'string', description: 'The primary name' },
    ],
  },
  {
    name: 'setPubkey',
    description: 'Set the SECP256k1 public key. Requires ROLE_SET_PUBKEY.',
    params: [
      { name: 'node', type: 'bytes32', description: 'The namehash of the name' },
      { name: 'x', type: 'bytes32', description: 'X coordinate of the public key' },
      { name: 'y', type: 'bytes32', description: 'Y coordinate of the public key' },
    ],
  },
  {
    name: 'setABI',
    description: 'Set ABI data. Requires ROLE_SET_ABI.',
    params: [
      { name: 'node', type: 'bytes32', description: 'The namehash of the name' },
      { name: 'contentType', type: 'uint256', description: 'ABI content type (must be a power of 2)' },
      { name: 'value', type: 'bytes', description: 'The ABI data' },
    ],
  },
  {
    name: 'setInterface',
    description: 'Set an interface implementer. Requires ROLE_SET_INTERFACE.',
    params: [
      { name: 'node', type: 'bytes32', description: 'The namehash of the name' },
      { name: 'interfaceId', type: 'bytes4', description: 'The EIP-165 interface ID' },
      { name: 'implementer', type: 'address', description: 'Contract implementing the interface' },
    ],
  },
  {
    name: 'setData',
    description: 'Set an arbitrary data record. Requires ROLE_SET_DATA.',
    params: [
      { name: 'node', type: 'bytes32', description: 'The namehash of the name' },
      { name: 'key', type: 'string', description: 'The data key' },
      { name: 'value', type: 'bytes', description: 'The data value' },
    ],
  },
  {
    name: 'setAlias',
    description: 'Set a name alias (DNS-encoded). Requires ROLE_SET_ALIAS on ROOT_RESOURCE.',
    params: [
      { name: 'fromName', type: 'bytes', description: 'DNS-encoded source name' },
      { name: 'toName', type: 'bytes', description: 'DNS-encoded target name' },
    ],
  },
  {
    name: 'clearRecords',
    description: 'Clear all records for a node by bumping the version. Requires ROLE_CLEAR.',
    params: [
      { name: 'node', type: 'bytes32', description: 'The namehash of the name' },
    ],
  },
  {
    name: 'authorizeNameRoles',
    description: 'Grant or revoke roles on a name.',
    params: [
      { name: 'toName', type: 'bytes', description: 'DNS-encoded name to authorize for' },
      { name: 'roleBitmap', type: 'uint256', description: 'Bitmap of roles to grant or revoke' },
      { name: 'account', type: 'address', description: 'Account to modify roles for' },
      { name: 'grant', type: 'bool', description: 'True to grant, false to revoke' },
    ],
    returns: [
      { name: 'success', type: 'bool', description: 'Whether the roles were updated' },
    ],
  },
  {
    name: 'authorizeTextRoles',
    description: 'Grant or revoke ROLE_SET_TEXT for a specific text key.',
    params: [
      { name: 'toName', type: 'bytes', description: 'DNS-encoded name' },
      { name: 'key', type: 'string', description: 'The text key to authorize' },
      { name: 'account', type: 'address', description: 'Account to modify roles for' },
      { name: 'grant', type: 'bool', description: 'True to grant, false to revoke' },
    ],
    returns: [
      { name: 'success', type: 'bool', description: 'Whether the roles were updated' },
    ],
  },
  {
    name: 'authorizeDataRoles',
    description: 'Grant or revoke ROLE_SET_DATA for a specific data key.',
    params: [
      { name: 'toName', type: 'bytes', description: 'DNS-encoded name' },
      { name: 'key', type: 'string', description: 'The data key to authorize' },
      { name: 'account', type: 'address', description: 'Account to modify roles for' },
      { name: 'grant', type: 'bool', description: 'True to grant, false to revoke' },
    ],
    returns: [
      { name: 'success', type: 'bool', description: 'Whether the roles were updated' },
    ],
  },
  {
    name: 'authorizeAddrRoles',
    description: 'Grant or revoke ROLE_SET_ADDR for a specific coin type.',
    params: [
      { name: 'toName', type: 'bytes', description: 'DNS-encoded name' },
      { name: 'coinType', type: 'uint256', description: 'The coin type to authorize' },
      { name: 'account', type: 'address', description: 'Account to modify roles for' },
      { name: 'grant', type: 'bool', description: 'True to grant, false to revoke' },
    ],
    returns: [
      { name: 'updated', type: 'bool', description: 'Whether the roles were updated' },
    ],
  },
  {
    name: 'initialize',
    description: 'Initialize the proxy instance. Grants the given roles to the admin on ROOT_RESOURCE, then executes the setter calls via multicall with permission checks bypassed.',
    params: [
      { name: 'admin', type: 'address', description: 'The initial admin address' },
      { name: 'roleBitmap', type: 'uint256', description: 'Bitmap of roles to grant' },
      { name: 'setters', type: 'bytes[]', description: 'Encoded setter calls to execute during initialization (permission checks are bypassed)' },
    ],
  },
  {
    name: 'multicall',
    description: 'Execute multiple write operations in a single transaction.',
    params: [
      { name: 'calls', type: 'bytes[]', description: 'Array of encoded function calls' },
    ],
    returns: [
      { name: 'results', type: 'bytes[]', description: 'Array of return data from each call' },
    ],
  },
]} />

### View Functions

<ContractReference functions={[
  {
    name: 'addr',
    description: 'Get the ETH address for a node.',
    params: [
      { name: 'node', type: 'bytes32', description: 'The namehash of the name' },
    ],
    returns: [
      { name: 'addr', type: 'address payable', description: 'Ethereum address' },
    ],
  },
  {
    name: 'addr',
    description: 'Get the multichain address for a node.',
    params: [
      { name: 'node', type: 'bytes32', description: 'The namehash of the name' },
      { name: 'coinType', type: 'uint256', description: 'The coin type to query' },
    ],
    returns: [
      { name: 'addressBytes', type: 'bytes', description: 'Encoded address bytes' },
    ],
  },
  {
    name: 'text',
    description: 'Get a text record value.',
    params: [
      { name: 'node', type: 'bytes32', description: 'The namehash of the name' },
      { name: 'key', type: 'string', description: 'The text record key' },
    ],
    returns: [
      { name: 'value', type: 'string', description: 'Text record value' },
    ],
  },
  {
    name: 'contenthash',
    description: 'Get the content hash.',
    params: [
      { name: 'node', type: 'bytes32', description: 'The namehash of the name' },
    ],
    returns: [
      { name: 'hash', type: 'bytes', description: 'Content hash' },
    ],
  },
  {
    name: 'name',
    description: 'Get the reverse name.',
    params: [
      { name: 'node', type: 'bytes32', description: 'The namehash of the name' },
    ],
    returns: [
      { name: 'name', type: 'string', description: 'Primary name' },
    ],
  },
  {
    name: 'pubkey',
    description: 'Get the SECP256k1 public key.',
    params: [
      { name: 'node', type: 'bytes32', description: 'The namehash of the name' },
    ],
    returns: [
      { name: 'x', type: 'bytes32', description: 'X coordinate' },
      { name: 'y', type: 'bytes32', description: 'Y coordinate' },
    ],
  },
  {
    name: 'ABI',
    description: 'Get ABI data.',
    params: [
      { name: 'node', type: 'bytes32', description: 'The namehash of the name' },
      { name: 'contentTypes', type: 'uint256', description: 'Bitmask of accepted content types' },
    ],
    returns: [
      { name: 'contentType', type: 'uint256', description: 'Matched content type' },
      { name: 'value', type: 'bytes', description: 'ABI data' },
    ],
  },
  {
    name: 'data',
    description: 'Get an arbitrary data record.',
    params: [
      { name: 'node', type: 'bytes32', description: 'The namehash of the name' },
      { name: 'key', type: 'string', description: 'The data key' },
    ],
    returns: [
      { name: 'value', type: 'bytes', description: 'Data value' },
    ],
  },
  {
    name: 'interfaceImplementer',
    description: 'Get the interface implementer address.',
    params: [
      { name: 'node', type: 'bytes32', description: 'The namehash of the name' },
      { name: 'interfaceId', type: 'bytes4', description: 'The EIP-165 interface ID' },
    ],
    returns: [
      { name: 'implementer', type: 'address', description: 'Implementer address' },
    ],
  },
  {
    name: 'hasAddr',
    description: 'Check whether an address record exists.',
    params: [
      { name: 'node', type: 'bytes32', description: 'The namehash of the name' },
      { name: 'coinType', type: 'uint256', description: 'The coin type to check' },
    ],
    returns: [
      { name: 'exists', type: 'bool', description: 'True if a non-empty address record is set' },
    ],
  },
  {
    name: 'getAlias',
    description: 'Get the alias target for a name.',
    params: [
      { name: 'fromName', type: 'bytes', description: 'DNS-encoded source name' },
    ],
    returns: [
      { name: 'toName', type: 'bytes', description: 'DNS-encoded target name, or empty if no alias' },
    ],
  },
  {
    name: 'recordVersions',
    description: 'Get the current record version number.',
    params: [
      { name: 'node', type: 'bytes32', description: 'The namehash of the name' },
    ],
    returns: [
      { name: 'version', type: 'uint64', description: 'Current version number' },
    ],
  },
  {
    name: 'resolve',
    description: 'Resolve a name by applying alias rewriting (if set) and dispatching to the appropriate resolver profile. Implements IExtendedResolver.',
    params: [
      { name: 'fromName', type: 'bytes', description: 'DNS-encoded name to resolve' },
      { name: 'fromData', type: 'bytes', description: 'Encoded resolver call (e.g. addr, text)' },
    ],
    returns: [
      { name: 'result', type: 'bytes', description: 'Encoded result from the resolver profile' },
    ],
  },
]} />

### Events

<ContractReference functions={[
  {
    name: 'AddrChanged',
    description: 'ETH address changed.',
    params: [
      { name: 'node', type: 'bytes32', indexed: true, description: 'Namehash of the name' },
      { name: 'a', type: 'address', description: 'New ETH address' },
    ],
  },
  {
    name: 'AddressChanged',
    description: 'Multichain address changed.',
    params: [
      { name: 'node', type: 'bytes32', indexed: true, description: 'Namehash of the name' },
      { name: 'coinType', type: 'uint256', description: 'Coin type' },
      { name: 'newAddress', type: 'bytes', description: 'New encoded address' },
    ],
  },
  {
    name: 'TextChanged',
    description: 'Text record changed.',
    params: [
      { name: 'node', type: 'bytes32', indexed: true, description: 'Namehash of the name' },
      { name: 'indexedKey', type: 'string', indexed: true, description: 'Indexed copy of the key' },
      { name: 'key', type: 'string', description: 'The text key' },
      { name: 'value', type: 'string', description: 'New text value' },
    ],
  },
  {
    name: 'DataChanged',
    description: 'Data record changed.',
    params: [
      { name: 'node', type: 'bytes32', indexed: true, description: 'Namehash of the name' },
      { name: 'indexedKey', type: 'string', indexed: true, description: 'Indexed copy of the key' },
      { name: 'key', type: 'string', description: 'The data key' },
      { name: 'indexedData', type: 'bytes', indexed: true, description: 'Indexed copy of the data value' },
    ],
  },
  {
    name: 'ContenthashChanged',
    description: 'Content hash changed.',
    params: [
      { name: 'node', type: 'bytes32', indexed: true, description: 'Namehash of the name' },
      { name: 'hash', type: 'bytes', description: 'New content hash' },
    ],
  },
  {
    name: 'NameChanged',
    description: 'Reverse name changed.',
    params: [
      { name: 'node', type: 'bytes32', indexed: true, description: 'Namehash of the name' },
      { name: 'name', type: 'string', description: 'New primary name' },
    ],
  },
  {
    name: 'PubkeyChanged',
    description: 'Public key changed.',
    params: [
      { name: 'node', type: 'bytes32', indexed: true, description: 'Namehash of the name' },
      { name: 'x', type: 'bytes32', description: 'New X coordinate' },
      { name: 'y', type: 'bytes32', description: 'New Y coordinate' },
    ],
  },
  {
    name: 'ABIChanged',
    description: 'ABI data changed.',
    params: [
      { name: 'node', type: 'bytes32', indexed: true, description: 'Namehash of the name' },
      { name: 'contentType', type: 'uint256', indexed: true, description: 'The content type that changed' },
    ],
  },
  {
    name: 'InterfaceChanged',
    description: 'Interface implementer changed.',
    params: [
      { name: 'node', type: 'bytes32', indexed: true, description: 'Namehash of the name' },
      { name: 'interfaceID', type: 'bytes4', indexed: true, description: 'The EIP-165 interface ID' },
      { name: 'implementer', type: 'address', description: 'New implementer address' },
    ],
  },
  {
    name: 'VersionChanged',
    description: 'Records cleared (version bumped).',
    params: [
      { name: 'node', type: 'bytes32', indexed: true, description: 'Namehash of the name' },
      { name: 'newVersion', type: 'uint64', description: 'New version number' },
    ],
  },
  {
    name: 'AliasChanged',
    description: 'Alias set or removed.',
    params: [
      { name: 'indexedFromName', type: 'bytes', indexed: true, description: 'Indexed copy of source name' },
      { name: 'indexedToName', type: 'bytes', indexed: true, description: 'Indexed copy of target name' },
      { name: 'fromName', type: 'bytes', description: 'DNS-encoded source name' },
      { name: 'toName', type: 'bytes', description: 'DNS-encoded target name' },
    ],
  },
  {
    name: 'NamedResource',
    description: 'EAC resource linked to a name.',
    params: [
      { name: 'resource', type: 'uint256', indexed: true, description: 'The EAC resource ID' },
      { name: 'name', type: 'bytes', description: 'DNS-encoded name' },
    ],
  },
  {
    name: 'NamedTextResource',
    description: 'EAC resource linked to a text key.',
    params: [
      { name: 'resource', type: 'uint256', indexed: true, description: 'The EAC resource ID' },
      { name: 'name', type: 'bytes', description: 'DNS-encoded name' },
      { name: 'keyHash', type: 'bytes32', indexed: true, description: 'Hash of the text key' },
      { name: 'key', type: 'string', description: 'The text key' },
    ],
  },
  {
    name: 'NamedDataResource',
    description: 'EAC resource linked to a data key.',
    params: [
      { name: 'resource', type: 'uint256', indexed: true, description: 'The EAC resource ID' },
      { name: 'name', type: 'bytes', description: 'DNS-encoded name' },
      { name: 'keyHash', type: 'bytes32', indexed: true, description: 'Hash of the data key' },
      { name: 'key', type: 'string', description: 'The data key' },
    ],
  },
  {
    name: 'NamedAddrResource',
    description: 'EAC resource linked to a coin type.',
    params: [
      { name: 'resource', type: 'uint256', indexed: true, description: 'The EAC resource ID' },
      { name: 'name', type: 'bytes', description: 'DNS-encoded name' },
      { name: 'coinType', type: 'uint256', indexed: true, description: 'The coin type' },
    ],
  },
]} />



---
title: Agent Text Records
description: Standardized text records for multichain ENS agent identity, context, and endpoint discovery. 
contributors: 
    - premm.eth
    - justghadi.eth
ensip:
  created: "2025-05-17"
  status: draft
track: Ecosystem
---

import { EnsipHeader } from "../../components/EnsipHeader";

# ENSIP-26: Agent Text Records

<EnsipHeader authors={["premm.eth","justghadi.eth"]} created="May 17, 2025" status="draft" />

## Abstract

This ENSIP extends ENSIP‑5: Text Records by standardizing the `agent-context` text record key and `agent-endpoint[<protocol>]` for agent interface discovery. An ENS name provides a single, multichain identity for an AI agent. The `agent-context` is the entry point: it describes the agent and may reference agent registries (e.g. ENSIP-25) or endpoints set via `agent-endpoint` records. Clients discover one identity, one context, and connect via the indicated registries or endpoints. 

## Motivation

Agentic systems require a single, verifiable identity that works across chains. An ENS name provides that: one identity, one place for context and discovery. This ENSIP standardizes how agents declare themselves via `agent-context` and `agent-endpoint`. The context can point to whether the agent is registered in agent registries (e.g. ENSIP-25) or has protocol endpoints (MCP, A2A) set via `agent-endpoint` text records. 

## Specification

The key words "MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT", "SHOULD", "SHOULD NOT", "RECOMMENDED", "MAY", and "OPTIONAL" in this document are to be interpreted as described in RFC 2119.

### Text Record Keys

#### agent-context

- **Key**: `agent-context`
- **Format**: Any format suitable for agentic systems (plain text, Markdown, YAML, JSON, etc.)

The key **MUST** be published via `text(bytes32,string)` as defined in ENSIP‑5. The content describes the agent and how to interact with it. The content MAY reference whether the agent is registered in agent registries (e.g. ENSIP-25 `agent-registration` records) or has endpoints published via `agent-endpoint` text records. This gives clients a single entry point to understand the agent's identity and how to reach it.

#### agent-endpoint

- **Key**: `agent-endpoint[<protocol>]`
- **Format**: A URL (e.g. `https://`, `http://`) identifying the endpoint for the specified agent protocol.

Name owners MAY publish one or more `agent-endpoint` records for different agent interfaces. Supported protocol values align with [ERC-8004](https://eips.ethereum.org/EIPS/eip-8004) services:

| Protocol | Description |
| -------- | ----------- |
| `mcp` | [Model Context Protocol](https://modelcontextprotocol.io/) – tools, resources, prompts |
| `a2a` | [Agent-to-Agent Protocol](https://google-a2a.github.io/A2A/) – agent authentication, skills, messaging |
| `web` | Web interface or human-facing URL |

Example records:

| Key | Value |
| ----- | ----- |
| `agent-endpoint[mcp]` | `https://token-swap.mcp` |
| `agent-endpoint[a2a]` | `https://token-swap.a2a` |
| `agent-endpoint[web]` | `https://agent.example.com/` |

The value MUST be a valid URL, including IPFS URIs (e.g. `ipfs://{cid}`). Clients interpret the protocol and connect accordingly. Additional protocol values MAY be used as the ecosystem evolves.

### Agent Resolution

To resolve an agent for an ENS name (the agent's single identity):

1. Load the `agent-context` text record for the name using the resolver interface defined in ENSIP‑5.
2. Read the record content. The content describes the agent, how to interact with it, and may reference registries (ENSIP-25) or `agent-endpoint` records.
3. Optionally, load `agent-endpoint[<protocol>]` records to discover protocol-specific endpoints (MCP, A2A, etc.).

If `agent-context` is absent, no agent context is available for that name.

### Example: Multichain agent with single identity

A Swap Agent has one identity. The context describes the agent and points to how it can be reached:

| Key | Value |
| ----- | ----- |
| `agent-context` | See below |
| `agent-endpoint[mcp]` | `https://token-swap.mcp` |
| `agent-endpoint[a2a]` | `https://token-swap.a2a` |

```markdown
# Swap Agent

I am a multichain swapping agent with a single ENS identity. Connect to me via the MCP or A2A endpoints set in my agent-endpoint text records.

My verified tokens for swapping include:
| Symbol | Chain ID | Address |
|--------|----------|---------|
| WETH   | 1        | 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2 |
| USDC   | 1        | 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48 |
| WETH   | 8453     | 0x4200000000000000000000000000000000000006 |
| USDC   | 8453     | 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913 |
| WETH   | 10       | 0x4200000000000000000000000000000000000006 |
| USDC   | 10       | 0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85 |
```

## Backwards Compatibility

Unaware clients will ignore the new keys; existing behavior is unaffected.

## Security Considerations

There are no security considerations specific to this ENSIP. Standard ENS security considerations apply to the underlying text record functionality.

## Rationale

This ENSIP creates a single identity model for multichain agents. An ENS name is the identity; `agent-context` is the entry point (analogous to `index.html`), and it can point to registries or endpoints. The `agent-endpoint` records enable direct connections to MCP, A2A, and other protocols. By unifying context and discovery under one ENS name, clients get one place to understand and reach an agent—whether it is registered on-chain, exposed via endpoints, or both.

Future ENSIPs may define more specific formats, but this specification intentionally remains minimal to encourage adoption and experimentation.

## Copyright

Copyright and related rights waived via [CC0](https://creativecommons.org/publicdomain/zero/1.0/).




enslabs.eth
enslabs.eth
ENSIP-25: Verifiable AI Agent Identity with ENS
March 4th 2026
5 min read
AI
ENSIP
ENSIP-25 introduces a simple, standardized way to verify that an AI agent registered in an on-chain registry, such as ERC-8004, is genuinely associated with an ENS name. It does this by defining a specific ENS text record format that links a registry entry to a name, enabling deterministic verification without requiring new contracts or resolver upgrades. In practice, the ENS name owner sets a straightforward text record to confirm the connection between their on-chain AI agent and their ENS name. As AI agents become more prevalent on-chain, ENSIP-25 positions ENS as a neutral identity layer that can reliably represent both humans and autonomous software.

An Introduction to ENSIP-25
As on-chain AI agents become more common, a basic question emerges: how do you verify that an agent really controls the identity it claims?

ENSIP-25 defines a minimal solution. It introduces a standardized ENS text record that links an ENS name to an AI agent registry entry. If the record is set to "1" or any other non-empty value the association is considered verified.

The format looks like this:

agent-registration[<registry>][<agentId>]
Verification is straightforward:

Start from a registry entry for an agent that claims an association with an ENS name.
Construct the text record key using the ERC-7930 interoperable address of the on-chain agent registry and the agent's unique identifier within that registry.
Resolve it on the claimed ENS name. For example, for the agent with id 42 in the ERC-8004 IdentityRegistry (0x8004A169FB4a3325136EB29fA0ceB6D2e539a432) on Ethereum mainnet, you would resolve the text record:
agent-registration[0x000100000101148004a169fb4a3325136eb29fa0ceb6d2e539a432][42]
If the record is set to "1" or any other non-empty value, the association is confirmed.
Websites or frontends listing on-chain AI agents can use this procedure to verify the association between an agent identity and a claimed ENS name, and introduce badges for verified agents to add an additional layer of trust. Conversely, agents associated with a given ENS name can be discovered by scanning for the existence of relevant text records.

This approach uses only existing ENS primitives. No new contracts or resolver upgrades.

Verification Scenarios in Practice
The animation below illustrates how ENSIP-25 verification behaves in three common scenarios.

First, a fully verified association. The AI agent's registry entry lists an ENS name, and the ENS name owner has set the corresponding agent-registration[...][...] text record. Because both sides of the link exist, clients can deterministically confirm that the agent and the ENS name belong together.

Second, a one-sided claim from the registry. The agent's registration entry lists an ENS name, but the ENS name does not contain the corresponding text record. In this case the association cannot be verified, since the ENS name owner has not confirmed the relationship.

Third, a one-sided claim from the ENS side. The ENS name contains the agent-registration[...][...] text record, but the specified registry entry does not reference that ENS name. This may indicate a stale or incorrect configuration, and the association again cannot be verified.

ENSIP-25

Agent Registry Attestation
Verify bidirectional attestations between ENS names and agent identities registered in ERC-8004 agent registries.

ENS NAME
ens-registration-agent.ses.eth
ens-registration-agent.ses
.eth
AGENT ID
26433
REGISTRY
8004 @ Ethereum Mainnet
What This Means for ENS Users
For ENS users, ENSIP-25 brings clarity to a new kind of identity that is starting to appear on-chain: autonomous agents.

ENS names already function as portable, human-readable identities across wallets, apps, and protocols. But as AI agents begin signing transactions, holding assets, interacting with contracts autonomously, and participating in governance, a new question emerges: how do you know which identity an actual agent controls?

ENSIP-25 answers that with a simple, deterministic mechanism. If an AI agent is registered in a system like ERC-8004 and claims an ENS name, the name owner can explicitly confirm that association by setting a standardized text record. From there, wallets, explorers, and frontends can independently verify the link using a single resolver lookup.

In practice, this means:

Wallets can display verified ENS names for AI agents rather than raw addresses.
Users can confirm that an agent claiming to be researchbot.eth is actually authorized by that ENS name.
Applications can attach a consistent, human-readable identity to autonomous on-chain behavior.
Frontends can introduce verified badges for agents that complete this verification flow.
Importantly, this works using existing ENS primitives, which means no new resolver upgrades or custom integrations per registry. Instead, we now have a standardized pattern that clients can implement once and reuse.

As more agents begin to transact, coordinate, and operate independently, ENSIP-25 ensures that their identities remain legible, portable, and verifiable across the ecosystem.

Why This Matters
ENSIP-25 is deliberately minimal. But its implications are larger than the mechanism itself.

We are entering a phase where software agents are not just passive tools but active participants in on-chain systems. They register identities. They execute transactions. They manage treasuries. They interact with protocols without direct human initiation.

When that happens, identity continuity becomes critical.

If an agent participates in governance, interacts with a lending protocol, or signs messages across multiple applications, users need to know whether they are interacting with the same entity each time. They need a stable reference point. ENS already provides that continuity for individuals and organizations. ENSIP-25 extends that continuity to autonomous software.

The key design choice here is neutrality. ENS does not become the AI registry. It does not define what an agent is. It does not dictate registry structure. Instead, it provides a verification bridge: a standardized way for names to attest to registry entries.

This reinforces ENS as a neutral identity layer for Ethereum and beyond. Humans, DAOs, organizations, and now AI agents can all anchor themselves to names that are portable across applications.

ENSIP-25 does not attempt to solve agent identity in full. It solves one focused problem: verifiable linkage between an on-chain agent and an ENS name. But in doing so, it strengthens ENS's role as infrastructure for readable, persistent identity in an increasingly autonomous on-chain world.