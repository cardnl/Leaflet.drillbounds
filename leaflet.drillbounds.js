L.DrillBoundaries = L.FeatureGroup.extend({
  initialize: function (options) {
    L.Util.setOptions(this, options);
    this._levels = [{ group: L.featureGroup(), selected: null }];
    this._levels[0].group.addEventParent(this);
    this._currLevel = 0;
    this._enabled = true;

    this._styles = {
      hidden: {
        fill: false,
        weight: 0
      },
      default: {
        fill: true,
        fillColor: '#777',
        fillOpacity: 0.5,
        color: 'white',
        weight: 2
      },
      selected: {
        fill: false,
        color: '#ffaf3b',
        weight: 5
      },
      ...(options ? (options.styles || {}) : {})
    };
  },
  _getSelected: function () {
    if (this._currLevel > 0) {
      return this._levels[this._currLevel - 1].selected;
    }
    return null;
  },
  _pointInSelected: function (latLng) {
    if (this._currLevel > 0) {
      const lastSelect = this._getSelected();
      const lastAsGeoJSON = L.geoJSON(lastSelect.feature);
      return leafletPip.pointInLayer(latLng, lastAsGeoJSON, true).length;
    }
    return true;
  },
  _showLevel: function (level) {
    this._levels.forEach(i => i.group.setStyle(this._styles.hidden));
    if (level >= 0 && level < this._levels.length) {
      this._currLevel = level;
      this._levels[level].group.setStyle(this._styles.default);
    }
    return this._levels[this._currLevel];
  },
  _drillDown: function (level, layer) {
    this._levels[this._currLevel].selected = layer;
    const nextLevel = this._showLevel(this._currLevel + 1);

    // Bring next level to back, so selected is on top
    nextLevel.group.getLayers().forEach(l => l.bringToBack());
    layer.setStyle(this._styles.selected);

    return layer;
  },
  drillUp: function () {
    if (this._currLevel <= 0) {
      return;
    }

    const currSelected = this._levels[this._currLevel].selected;

    // If current level has selected, unselect it first
    const nextLevel = this._showLevel(
      this._currLevel - currSelected ? 0 : 1
    );
    this._levels[this._currLevel].selected = null;

    // If previous level exists
    if (this._currLevel > 0) {
      // Bring back & select next level
      nextLevel.group.getLayers().forEach(l => l.bringToBack());
      const nextSelected = this._levels[this._currLevel - 1].selected;
      nextSelected.setStyle(this._styles.selected);
      if (this._map) {
        this._map.flyToBounds(nextSelected);
      }
      this.fire('drill', { layer: nextSelected });
    }
  },
  addLayerAt: function (level, layer) {
    while (this._levels.length <= level) {
      this._levels.push({ group: L.featureGroup(), selected: null });
    }
    this._levels[level].group.addLayer(layer);
    this.fire('layeradd', { layer: layer });

    // Show current level
    layer.setStyle({ className: 'drillbounds-layer' });
    if (level === this._currLevel) {
      layer.setStyle(this._styles.default);
    } else {
      layer.setStyle(this._styles.hidden);
    }

    // Bind click to each feature
    layer.eachLayer(layer => {
      layer.on('click', evt => {
        if (!this._pointInSelected(evt.latlng) ||
          this._getSelected() === layer || !this._enabled) {
          return;
        }
        this._drillDown(level, layer);
        this.fire('drill', { layer: layer });
        this.fire('click', { layer: layer });
        if (this._map) {
          evt.target._map.flyToBounds(layer);
        }
      });
    });

    return this;
  },
  addLayer: function (layer) {
    return this.addLayerAt(this._currLevel, layer);
  },
  onAdd: function (map) {
    this._map = map;
    this._levels.forEach(level => level.group.addTo(map));
  },
  onRemove: function (map) {
    this._map = null;
    this._levels.forEach(level => level.group.remove());
  },
  toggle: function (value) {
    this._enabled = value;
  }
});

L.drillBoundaries = function (options) {
  return new L.DrillBoundaries(options);
};
