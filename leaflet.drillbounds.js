L.DrillBoundaries = L.LayerGroup.extend({
    initialize: function (options) {
        const { styles } = options || { styles: {} };
        L.setOptions(this, options);
        
        this._listeners = { click: () => {} };
        this._levelAt = 0;
        this._levels = [];
        this._enabled = true;

        // Change to CSS
        this._styles = {
            hidden: {
		fill: false,
		color: "transparent",
		weight: 0,
            },
            default: {
		fill: true,
		color: "white",
		fillColor: "#777",
		fillOpacity: 0.5,
		weight: 2,
                ...(styles.default || {})
            },
            selected:{
		"fill": false,
		"color": "#ffaf3b",
		"weight": 5,
                ...(styles.selected || {})
	    },
            selected2:{
		"fill": true,
		fillColor: "#777",
		fillOpacity: 0.5,
		"color": "#ffaf3b",
		"weight": 5,
                ...(styles.selected2 || {})
	    }
        };
        
    },
    _headLevel: function () {
        return this._levels[this._levels.length - 1];
    },
    _showLevel: function (level) {
        let levelShown;
        for (let i = 0; i < this._levels.length; i++) {
            for (let layer of this._levels[i].layers) {
                // Hide all layers, unless i === level
                if (i === level) {
                    levelShown = this._levels[i];
                    layer.setStyle(this._styles.default);
                } else {
                    layer.setStyle(this._styles.hidden);
                }
            }       
        }
        return levelShown;
    },
    setLevel: function (level) {
        const isLastLevel = level === this._levels.length;
        const prevLevel = this._levels[level - 1] || false;
        
        if (level >= 0 && level < this._levels.length) {
            // Show & set the level
            const nextLevel = this._showLevel(level);
            nextLevel.layers.forEach(l => l.bringToBack());
            this._levelAt = level;
        } else if (isLastLevel) {
            // If last level, hide all layers
            this._showLevel(-1);
            this._levelAt = level;
        }
        
        // If previous layer exists, show it's selection
        if (prevLevel && prevLevel.selected) {
            this._selectLayer(prevLevel.selected);
            return prevLevel.selected;
        } else {
            return null;
        }
    },
    addLevel: function (layer) {
        this._levels.push({ layers: [], selected: null });
    },
    _setSelected: function (layer) {
        if (this._levelAt < this._levels.length) {
            this._levels[this._levelAt].selected = layer;
        }
    },
    _pointInSelected: function (latLng) {
        if (this._levelAt > 0) {
            const lastSelect = this._levels[this._levelAt - 1].selected;
            const lastAsGeoJSON = L.geoJSON(lastSelect.feature);
            return leafletPip.pointInLayer(latLng, lastAsGeoJSON, true).length;
        }
        return true;
    },
    _layerIsSelected: function (layer) {
        if (this._levelAt > 0) {
            const lastSelect = this._levels[this._levelAt - 1].selected;
            return layer === lastSelect;
        }
        return false;
    },
    drillUp: function() {
        return this.setLevel(this._levelAt - 1);
    },
    drillDown: function() {
        return this.setLevel(this._levelAt + 1);
    },
    _selectLayer: function(layer) {
        layer.setStyle(this._styles.selected);
    },
    addLayer: function (layer) {
        if (layer instanceof L.LayerGroup) {
            this._headLevel().layers.push(layer);
        }
    },
    addGeoJSON: function (geojson) {
        const layer = L.geoJSON(geojson, {
	    style: this._styles.default,
	    onEachFeature: (feature, currLayer) => (
		// Send feature information to click
		currLayer.on('click', (evt) => {
                    // Check if click is in bounds
                    if (!this._pointInSelected(evt.latlng) ||
                        this._layerIsSelected(currLayer) || !this._enabled) {
                        return;
                    }
                    
                    // Select this layer
                    this._setSelected(currLayer);
                    
                    // Go to the next level level
                    this.drillDown();

                    this._listeners.click(evt, currLayer);
		})
	    )
        });
        this.addLayer(layer);
        return layer;
    },
    addToMap: function(map) {
        // Add all layers to the map
        for (let level of this._levels) {
            for (let layer of level.layers) {
                map.addLayer(layer);
            }
        }
    },
    on: function (type, callback) {
        this._listeners[type] = callback;
    },
    toggle: function (val) {
        this._enabled = val;
    }
});
L.drillBoundaries = function(options) {
    return new L.DrillBoundaries(options);
};
