class PointClouds {
    constructor() {
        this.cloudMaterial = new THREE.PointsMaterial({
            size: property.PointSize,
            vertexColors: true
        });

        this.clouds = [];
        this.cloudGeometries = {};
        this.cloudGeometryCaches = [];
    }

    AddPointCloud(id, points, r, g, b) {
        if (!this.cloudGeometries[id]) {
            this.cloudGeometries[id] = new THREE.Geometry();
        }
        for (let p of points) {
            this.cloudGeometries[id].vertices.push(new THREE.Vector3(p.x, p.y, p.z));
            this.cloudGeometries[id].colors.push(new THREE.Color("rgb(" + r + "," + g + "," + b + ")"));
        }
    }

    SetPointSize(val) {
        this.cloudMaterial.size = val;
    }

    Update(scene) {
        let i = 0;
        for(var id in this.cloudGeometries) {
            if (this.clouds[i]) {
                scene.remove(this.clouds[i]);
                this.cloudGeometryCaches[i].dispose();
            }

            try {
                this.cloudGeometryCaches[i] = this.cloudGeometries[id].clone();
                this.cloudGeometryCaches[i].colors = this.cloudGeometries[id].colors; // should use concat?
                this.clouds[i] = new THREE.Points(this.cloudGeometryCaches[i], this.cloudMaterial);
                scene.add(this.clouds[i]);
            } catch (e) {
                console.error("error while cloning CloudGeometry: " + e);
                console.error(i + ", " + this.cloudGeometries[i]);
            }
            i++;
        }
    }
}