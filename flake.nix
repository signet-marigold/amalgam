{
  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-24.11";
  };

  outputs = { self, nixpkgs, ... }:
  let
    system = "x86_64-linux";
    pkgs = nixpkgs.legacyPackages.${system};
  in {
    devShell.${system} = pkgs.mkShell {
      buildInputs = with pkgs; [
        rustc
        cargo
        cargo-generate
        nodejs
        wasm-pack
        lld_19
        typescript
        pkg-config
        ffmpeg
      ];
    };
  };
}
