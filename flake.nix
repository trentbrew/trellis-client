{
  description = "Toolkit UI Monorepo - Vue 3 component library + Nuxt 4 sandbox";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = { self, nixpkgs, flake-utils }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = nixpkgs.legacyPackages.${system};
      in {
        devShells.default = pkgs.mkShell {
          packages = with pkgs; [
            # Node.js and package management
            nodejs_20
            pnpm
            
            # Build tools
            just
            
            # Optional: useful dev tools
            git
            jq
          ];

          shellHook = ''
            echo "🧰 Toolkit UI Monorepo Dev Shell"
            echo "   Node: $(node --version)"
            echo "   pnpm: $(pnpm --version)"
            echo ""
            echo "Quick commands:"
            echo "  just dev:v1   - Start component library dev server"
            echo "  just dev:v2   - Start Nuxt sandbox dev server"
            echo "  just install  - Install all dependencies"
            echo ""
          '';
        };
      });
}
