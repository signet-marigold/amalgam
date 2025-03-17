{
  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-24.11";
  };

  outputs = { self, nixpkgs, ... } @ inputs: let
    system = "x86_64-linux";
    pkgs = nixpkgs.legacyPackages.${system};
  in {
    devShell.${system} = pkgs.mkShell {
      buildInputs = with pkgs; [
      # dev
        rustc
        cargo
        cargo-generate
        nodejs
        wasm-pack
      # build
        lld_19
        typescript
      ];
    };
  };
}
