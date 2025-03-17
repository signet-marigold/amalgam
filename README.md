### Prerequisites if not using nix package manager

- Rust toolchain
- Node.js and npm
- wasm-pack

### Installation
```markdown
# Clone the repository
git clone https://github.com/signet-marigold/amalgam
cd amalgam

# Enter the Nix development environment
nix develop

# Build the Rust code to WebAssembly
wasm-pack build

# Install JavaScript dependencies
cd www
npm install

# Start the development server
npm start
```
