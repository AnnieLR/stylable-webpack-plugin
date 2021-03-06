const path = require("path");
const CommonJsRequireDependency = require("webpack/lib/dependencies/CommonJsRequireDependency");
const RequireHeaderDependency = require("webpack/lib/dependencies/RequireHeaderDependency");
const {
  rendererDependency,
  stylesheetDependency
} = require("./runtime-dependencies");
const { replaceUrls } = require("./utils");
const {
  StylableExportsDependency,
  StylableImportDependency,
  StylableAssetDependency
} = require("./StylableDependencies");

class StylableParser {
  constructor(stylable, compilation) {
    this.stylable = stylable;
    this.compilation = compilation;
  }

  parse(source, state) {
    if (state.module.loaders.length) {
      this.compilation.warnings.push(
        `Loading a Stylable stylesheet via webpack loaders is not supported and may cause runtime errors.\n"${state.module.rawRequest}" in "${state.module.issuer.resource}"`
      );
      state.module.type = "stylable-raw";
      return state;
    }
    const meta = this.stylable.process(state.module.resource);
    state.module.buildInfo.stylableMeta = meta;
    // state.module.buildMeta.exportsType = "namespace";

    replaceUrls(meta.ast, node => {
      const resourcePath = node.url;
      const isAbs = path.isAbsolute(resourcePath);
      if (isAbs && resourcePath[0] === "/") {
        node.url = path.join(state.compilation.compiler.context, resourcePath);
        state.module.addDependency(new StylableAssetDependency(node.url));
      } else if (isAbs) {
        node.url = resourcePath;
        state.module.addDependency(new StylableAssetDependency(node.url));
      } else {
        node.url = path.join(state.module.context, resourcePath);
        state.module.addDependency(new StylableAssetDependency(resourcePath));
      }
    });

    state.module.addDependency(new StylableExportsDependency(["default"]));
    state.module.addDependency(stylesheetDependency());
    state.module.addDependency(rendererDependency());

    meta.imports.forEach(stylableImport => {
      if (stylableImport.fromRelative.match(/\.st\.css$/)) {
        state.module.addDependency(
          new StylableImportDependency(stylableImport.fromRelative, {
            defaultImport: stylableImport.defaultExport,
            names: []
          })
        );
      }
      //TODO: handle js dependencies?
    });

    return state;
  }
}

module.exports = StylableParser;
