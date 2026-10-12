"use strict";

/*
 * CatMatch Thailand-only map layer.
 * The country boundary is stored as coordinates, not as an image.
 * Every OpenStreetMap tile is drawn to a canvas and clipped to Thailand.
 */
window.CatMatchThailandMap = (() => {
  const BOUNDS = [
    [5.55, 97.25],
    [20.55, 105.72],
  ];

  const GEOJSON = {
    type: "Feature",
    properties: { name: "Thailand" },
    geometry: {"type":"Polygon","coordinates":[[[105.21877689007889,14.273211778210694],[104.28141808473661,14.416743068901367],[102.98842207236163,14.225721136934467],[102.34809939983302,13.394247341358223],[102.5849324890267,12.186594956913282],[101.68715783081996,12.645740057826572],[100.83180952352487,12.627084865769206],[100.9784672383692,13.412721665902566],[100.09779747925111,13.406856390837433],[100.01873253784456,12.307001044153354],[99.15377241414316,9.963061428258555],[99.22239871622676,9.239255479362427],[99.87383182169813,9.20786204674512],[100.27964684448622,8.295152899606052],[100.45927412313276,7.429572658717177],[101.01732791545273,6.856868597842478],[101.62307905477806,6.74062246340192],[102.14118696493638,6.221636053894628],[101.81428185425798,5.8108084171742425],[101.15421878459387,5.691384182147715],[101.07551557821336,6.2048670516159214],[100.25959638875696,6.6428248152895435],[100.0857568705271,6.4644894474502905],[99.69069054565576,6.8482127954335965],[99.51964155476963,7.34345388430276],[98.9882528015123,7.907993068875328],[98.503786248776,8.382305202666288],[98.339661899817,7.794511623562386],[98.15000939330582,8.350007432483878],[98.25915001830626,8.973922837759801],[98.55355065307305,9.932959906448545],[99.03812055867398,10.960545762572437],[99.58728600463972,11.892762762901697],[99.19635379435167,12.80474843998867],[99.21201175333609,13.269293728076464],[99.09775516153876,13.827502549693278],[98.43081912637987,14.622027696180837],[98.1920740091914,15.123702500870351],[98.53737592976572,15.308497422746084],[98.90334842325676,16.17782420497612],[98.49376102091135,16.83783559820793],[97.85912275593486,17.567946071843664],[97.37589643757354,18.445437730375815],[97.79778283080441,18.627080389881755],[98.25372399291561,19.708203029860044],[98.95967573445488,19.752980658440947],[99.54330936075931,20.186597601802063],[100.11598758341785,20.417849636308187],[100.54888105672688,20.109237982661128],[100.60629357300316,19.508344427971224],[101.2820146016517,19.462584947176765],[101.03593143107777,18.408928330961615],[101.05954756063517,17.51249725999449],[102.11359175009248,18.109101670804165],[102.41300499879162,17.932781683824288],[102.99870568238771,17.9616946476916],[103.20019209189374,18.309632066312773],[103.9564766784853,18.24095408779688],[104.7169470560925,17.42885895433008],[104.7793205098688,16.44186493577145],[105.58903852745016,15.570316066952858],[105.54433841351769,14.723933620660418],[105.21877689007889,14.273211778210694]]]},
  };

  const TILE_URL = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";

  function geometryRings(geometry) {
    if (!geometry) return [];
    if (geometry.type === "Polygon") return geometry.coordinates;
    if (geometry.type === "MultiPolygon") return geometry.coordinates.flat();
    return [];
  }

  function createThailandTileLayer(options = {}) {
    if (!window.L) return null;

    const rings = geometryRings(GEOJSON.geometry);
    const BoundaryGrid = L.GridLayer.extend({
      initialize(layerOptions) {
        L.setOptions(this, layerOptions);
      },

      createTile(coords, done) {
        const tile = document.createElement("canvas");
        const size = this.getTileSize();
        const context = tile.getContext("2d");
        tile.width = size.x;
        tile.height = size.y;
        tile.setAttribute("role", "presentation");

        const image = new Image();
        image.decoding = "async";

        image.onload = () => {
          try {
            const tileOrigin = L.point(coords.x, coords.y).scaleBy(size);
            context.save();
            context.beginPath();

            rings.forEach((ring) => {
              ring.forEach(([longitude, latitude], index) => {
                const point = this._map
                  .project(L.latLng(latitude, longitude), coords.z)
                  .subtract(tileOrigin);

                if (index === 0) context.moveTo(point.x, point.y);
                else context.lineTo(point.x, point.y);
              });
              context.closePath();
            });

            try { context.clip("evenodd"); }
            catch (_error) { context.clip(); }

            context.drawImage(image, 0, 0, size.x, size.y);
            context.restore();
            done(null, tile);
          } catch (error) {
            done(error, tile);
          }
        };

        image.onerror = () => done(new Error("โหลดแผนที่ไม่สำเร็จ"), tile);
        image.src = L.Util.template(TILE_URL, {
          z: coords.z,
          x: coords.x,
          y: coords.y,
        });

        return tile;
      },

      getAttribution() {
        return this.options.attribution || "";
      },
    });

    return new BoundaryGrid({
      tileSize: 256,
      minZoom: options.minZoom ?? 5,
      maxZoom: options.maxZoom ?? 18,
      keepBuffer: 2,
      updateWhenIdle: false,
      attribution: options.attribution || "",
      className: "thailand-boundary-tiles",
    });
  }

  function addThailandLayer(map, options = {}) {
    if (!map || !window.L) return null;

    const tiles = createThailandTileLayer(options);
    tiles?.addTo(map);

    const border = L.geoJSON(GEOJSON, {
      interactive: false,
      style: {
        color: options.borderColor || "#73aeda",
        weight: options.borderWeight || 2,
        opacity: 0.96,
        fill: false,
      },
    }).addTo(map);

    return { tiles, border };
  }

  return {
    BOUNDS,
    GEOJSON,
    createThailandTileLayer,
    addThailandLayer,
  };
})();
