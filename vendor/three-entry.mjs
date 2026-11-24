// Pinned local classic-script build for file:// (ES-module imports there are blocked by CORS).
// npm install --no-save three@0.180.0 esbuild@0.25.12
// npx esbuild vendor/three-entry.mjs --bundle --minify --format=iife --global-name=THREE --outfile=vendor/three-r180.min.js
export { WebGLRenderer, Scene, PerspectiveCamera, Group, Object3D, Mesh, InstancedMesh,
  MeshStandardMaterial, MeshLambertMaterial, MeshPhongMaterial, MeshBasicMaterial, ShaderMaterial, Color, Vector2, Vector3, Raycaster,
  Box3, Matrix4, BoxGeometry, PlaneGeometry, CylinderGeometry, ConeGeometry, SphereGeometry,
  DodecahedronGeometry, Shape, ExtrudeGeometry, CatmullRomCurve3, TubeGeometry, PointLight,
  IcosahedronGeometry, CircleGeometry, RingGeometry, BufferGeometry, BufferAttribute,
  HemisphereLight, DirectionalLight, FogExp2, CanvasTexture, RepeatWrapping, SRGBColorSpace,
  DoubleSide, BackSide, DynamicDrawUsage, ACESFilmicToneMapping, PCFSoftShadowMap, GridHelper, PMREMGenerator } from 'three';
export { OrbitControls } from 'three/addons/controls/OrbitControls.js';
export { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
