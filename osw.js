class Team{
    constructor(name,hue){
        this.name = name;
        this.hue = hue;
        this.purse = 100000; //start with $100000
    }
}
class Piece{ //general object
    constructor(pieceId,node,icon,team,speed,population,type){
        this.pieceId = pieceId;
        this.team = team;
        this.type = type;
        this.node = Object.keys(nodes).includes(node.getAttribute('ref')) ? node : null;
        this.marker = (icon!==undefined && icon!==null) ? L.marker(this.node===null?[0,0]:getNodeLatLong(this.node),{icon:icon}) : L.marker(this.node===null?[0,0]:getNodeLatLong(this.node));
        this.marker.piece = this; //reference in the marker

        this.dead = false;

        //routing
        this.route = null;
        this.routeCounter = 0;
        this.routeLastMovement = 0;
        this.routeTimeCost = 0;

        //quantitative values
        this.maxPopulation = (population!==undefined && population!==null) ? population : 1; //default population
        this.population = this.maxPopulation;
        this.movementSpeed = (speed!==undefined && speed!==null) ? speed : 0.1; //1km/s per unit.
    }
    update(){  //called periodically
        let present = time();
        if(this.route!==null && present-this.routeLastMovement>this.routeTimeCost){
            if(this.routeCounter<this.route.length-2){
                this.routeCounter++;
                this.node = this.route[this.routeCounter];
                this.routeLastMovement = present;
                this.routeTimeCost = getGeoDistance(getNodeLatLong(this.route[this.routeCounter+1]),getNodeLatLong(this.route[this.routeCounter]))*1000/this.movementSpeed;

                this.marker.setLatLng(getNodeLatLong(this.node));
                this.marker.update();
            }else{
                this.routeCounter++;
                this.node = this.route[this.routeCounter];
                this.marker.setLatLng(getNodeLatLong(this.node));
                this.marker.update();
                this.halt();
            }
        }
    }
    follow(route){
        this.route = route;
        this.routeCounter = 0;
        this.routeLastMovement = time();
        this.routeTimeCost = getGeoDistance(getNodeLatLong(this.route[this.routeCounter+1]),getNodeLatLong(this.route[this.routeCounter]))*1000/this.movementSpeed;
    }
    halt(){
        this.route = null;
        this.routeCounter = 0;
        this.routeLastMovement = 0;
        this.routeTimeCost = 0;
    }
    updateIndicators(){
        this.marker.getElement().children[0].style.width = `${20*(this.population/this.maxPopulation)}px`;
    }
    damage(value){
        this.population -= value;
    }
}
class FortPiece extends Piece{
    constructor(name,node,team){
        super(-1,node,getIcon('base.png',team.hue),team,0,0,'base');
        this.name = name;
    }
}
class InfantryPiece extends Piece{
    constructor(pieceId,node,icon,team){
        super(pieceId,node,icon,team,0.1,100,'infantry');
    }
    update(){
        super.update();
        let near = pieces.filter(v=>v.pieceId!==this.pieceId&&v.team.name!==this.team.name&&getGeoDistance(getNodeLatLong(this.node),getNodeLatLong(v.node))<0.5); //attack those closer than 500m
        if(near.length>0){
            this.halt();
            if(Math.random()<0.4){ //40% chance to attack successfully
                near[0].damage(1);
                if(near[0].population<0){
                    near[0].dead = true;
                    near[0].marker.remove();
                }else{
                    near[0].updateIndicators();
                }
            }
        }
    }
}
class MinHeap{
    constructor(){
        this.list = [];
    }

    push(pair){
        this.list.push(pair);
        if(this.list.length>0){
            let i = this.list.length - 1;
            while(i>0 && this.list[Math.floor(i/2)][0]>this.list[i][0]){
                let t = this.list[i];
                this.list[i] = this.list[Math.floor(i/2)];
                this.list[Math.floor(i/2)] = t;
                i = Math.floor(i/2);
            }
        }
    }

    pop(){
        let c = this.list[0];
        if(this.list.length>1){
            this.list[0] = this.list[this.list.length-1];
            this.list.splice(this.list.length-1);
            if(this.list.length===2){
                if(this.list[0][0]>this.list[1][0]){
                    let t = this.list[0];
                    this.list[0] = this.list[1];
                    this.list[1] = t;
                }
                return c;
            }
            let i = 0;
            let j = 1;
            let k = 2;
            while(this.list[j]&&this.list[k]&&(this.list[i][0]>this.list[j][0]||this.list[i][0]>this.list[k][0])){
                if(this.list[j][0]<this.list[k][0]){
                    let t = this.list[j];
                    this.list[j] = this.list[i];
                    this.list[i] = t;
                    i = j;
                }else{
                    let t = this.list[k];
                    this.list[k] = this.list[i];
                    this.list[i] = t;
                    i = k;
                }
                j = i*2-1;
                k = i*2;
            }
        }else{
            this.list = [];
        }
        return c;
    }
}

function time(){
    return new Date().getTime();
}
function textFromURL(URL){
    let req = new XMLHttpRequest();
    req.open('GET',URL,false);
    req.send();
    return req.responseText;
}
function getNearestNode(c){
    let min = Number.MAX_VALUE;
    let minNode;
    for(let i = 0; i<nodesAll.length; i++){
        let dist = getGeoDistance(c,getNodeLatLong(nodesAll[i]));
        if(dist<min){
            min = dist;
            minNode = nodesAll[i];
        }
    }
    return minNode;
}
function getElementsByKeyValue(e,k,v){
    let subset = [];
    for(let i = 0; i<e.length; i++){
        if(e[i].getAttribute(k)===v){
            subset.push(e[i]);
        }
    }
    return subset;
}
function getNodeLatLong(node){
    return [node.getAttribute('lat'),node.getAttribute('lon')];
}
function movementOptions(neighbors){
    let options = [];
    for(let i = 0; i<neighbors.length; i++){
        if(neighbors[i].previousElementSibling.tagName!=='bounds'){
            options.push(neighbors[i].previousElementSibling);
        }
        if(neighbors[i].nextElementSibling.tagName!=='tag'){
            options.push(neighbors[i].nextElementSibling);
        }
    }
    return options;
}
function getGeoDistance(cx,cy){
    cx = cx.map(v => Number(v)*Math.PI/180);
    cy = cy.map(v => Number(v)*Math.PI/180);
    let k = Math.pow(Math.sin((cx[0]-cy[0])/2),2) + Math.pow(Math.sin((cx[1]-cy[1])/2),2) * Math.cos(cx[0]) * Math.cos(cy[0]);
    return 12756.274 * Math.atan2(Math.sqrt(k),Math.sqrt(1-k));
}
function getGeoAngle(cx,cy){
    cx = cx.map(v => Number(v)*Math.PI/180);
    cy = cy.map(v => Number(v)*Math.PI/180);
    return Math.PI/2 + Math.atan2(Math.sin(cx[1]-cy[1])*Math.cos(cx[0]),Math.cos(cy[0])*Math.sin(cx[0])-Math.cos(cx[0])*Math.sin(cy[0])*Math.cos(cx[1]-cy[1]));
}
function extendedMovementOptions(neighbors,destination){
    let options = [];
    let visited = [];
    let f = function(h){
        while(!junction.has(h.getAttribute('ref'))&&jb.has(h.getAttribute('ref'))){
            let n = nodes[h.getAttribute('ref')];
            h = n[n[0].parentNode.getAttribute('id')===h.parentNode.getAttribute('id')?n.length-1:0];
            let g = h.parentNode.getElementsByTagName('nd'); //because of preprocessing, we must be at an endpoint
            let c = g[0].getAttribute('ref')===h.getAttribute('ref');
            for(let j = c?1:g.length-1; c?j<g.length:j>-1; c?j++:j--){
                if(junction.has(g[j].getAttribute('ref')) || (destination!==null && destination!==undefined && destination.getAttribute('ref')===g[j].getAttribute('ref'))){
                    return g[j];
                }
                visited.push(g[j]); //we must not push the last point because it is a junction
            }
            h = g[c?g.length-1:0];
        }
        //return h; //if we allow dead ends to be visited then have this line uncommented
    };
    let pushMin = function(e,g){
        let z = options.map(v=>v[0].getAttribute('ref')).indexOf(e[0].getAttribute('ref'));
        if(z!==-1){ //there is already a way there, but is it the shortest?
            let x = 0;
            let y = 0;
            if(options[z][1].length===0){
                x = getGeoDistance(getNodeLatLong(g),getNodeLatLong(e[0]));
            }else{
                x = getGeoDistance(getNodeLatLong(g),getNodeLatLong(options[z][1][0])) + getGeoDistance(getNodeLatLong(options[z][1][options[z][1].length-1]),getNodeLatLong(e[0]));
                for(let i = 1; i<options[z][1].length; i++){
                    x += getGeoDistance(getNodeLatLong(options[z][1][i-1]),getNodeLatLong(options[z][1][i]));
                }
            }
            if(e[1].length===0){
                y = getGeoDistance(getNodeLatLong(g),getNodeLatLong(e[0]));
            }else{
                y = getGeoDistance(getNodeLatLong(g),getNodeLatLong(e[1][0])) + getGeoDistance(getNodeLatLong(e[1][e[1].length-1]),getNodeLatLong(e[0]));
                for(let i = 1; i<e[1].length; i++){
                    y += getGeoDistance(getNodeLatLong(e[1][i-1]),getNodeLatLong(e[1][i]));
                }
            }
            if(y<x){
                options[z] = e;
            }
        }else{
            options.push(e);
        }
    };
    for(let i = 0; i<neighbors.length; i++){ //each instance of the node is considered
        let p = neighbors[i].parentNode.getElementsByTagName('nd'); //nodes of the same way; we can be anywhere on it
        let m;
        let k = neighbors[i]; //the node we're looking at
        for(let j = 0; j<p.length; j++){ //finding the position on the way
            if(p[j].getAttribute('ref')===neighbors[i].getAttribute('ref')){
                m = j;
            }
        }
        if(m<p.length-1){ //walk one way to pick up a junction not at an endpoint
            let r = true;
            for(let j = m+1; j<p.length; j++){
                if(junction.has(p[j].getAttribute('ref')) || (destination!==null && destination!==undefined && destination.getAttribute('ref')===p[j].getAttribute('ref'))){
                    r = false;
                    pushMin([p[j],visited],neighbors[i]);
                    break;
                }
                visited.push(p[j]);
            }
            if(r){ //we hit an endpoint
                let x = f(p[p.length-1]);
                if(x!==undefined){
                    pushMin([x,visited],neighbors[i]);
                }
            }
        }
        visited = [];
        if(m>0){ //the other way
            let r = true;
            for(let j = m-1; j>-1; j--){
                if(junction.has(p[j].getAttribute('ref')) || (destination!==null && destination!==undefined && destination.getAttribute('ref')===p[j].getAttribute('ref'))){
                    r = false;
                    pushMin([p[j],visited],neighbors[i]);
                    break;
                }
                visited.push(p[j]);
            }
            if(r){ //we hit an endpoint
                let x = f(p[0]);
                if(x!==undefined){
                    pushMin([x,visited],neighbors[i]);
                }
            }
        }
        visited = [];
    }
    return options;
}
function getIcon(url,hue){
    return L.divIcon({html:`<div class="population-bar"></div><img src="${url}" style="filter:hue-rotate(${hue}deg);width:20px;height:20px;transform:translateX(-4px)translateY(-4px);">`});
}

let map = L.map('map').setView([27.11,142.21], 12);
L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{}).addTo(map);
let roads = omnivore.kml('/geo/ogasawara.kml');
roads.addTo(map);
let rawml = (new DOMParser()).parseFromString(textFromURL('/geo/ogasawara.osm'),'text/xml');
let nodesAll = Array.from(rawml.getElementsByTagName('nd'));
let nodes = {};
nodesAll.forEach(e => {
    if(nodes[e.getAttribute('ref')]===undefined){
        nodes[e.getAttribute('ref')]=[e];
    }else{
        nodes[e.getAttribute('ref')].push(e);
    }
});
let junction = new Set();
let ja = new Set();
let jb = new Set();
nodesAll.forEach(e => {
    if(!ja.has(e.getAttribute('ref'))){
        ja.add(e.getAttribute('ref'));
    }else if(!jb.has(e.getAttribute('ref'))){
        jb.add(e.getAttribute('ref'));
    }else{
        junction.add(e.getAttribute('ref'));
    }
});
jb.forEach(e => {
    let t = nodes[e];
    let a = t[0].parentNode.getElementsByTagName('nd');
    let b = t[1].parentNode.getElementsByTagName('nd');
    if((a[0].getAttribute('ref')!==t[0].getAttribute('ref') && a[a.length-1].getAttribute('ref')!==t[0].getAttribute('ref'))||(b[0].getAttribute('ref')!==t[1].getAttribute('ref') && b[b.length-1].getAttribute('ref')!==t[1].getAttribute('ref'))){
        junction.add(e);
    }
});

function pathFinder(start,end){ //start;end full nodes
    let navigator = new MinHeap();
    navigator.push([0,start]); //starting condition
    let path = {};
    let cost = {};
    let heuristicCost = {};
    let cache = {};
    junction.forEach(e => {
        if(cost[e]===undefined){
            cost[e] = Number.MAX_VALUE;
        }
        if(heuristicCost[e]===undefined){
            heuristicCost[e] = Number.MAX_VALUE;
        }
    });
    cost[start.getAttribute('ref')]=0
    heuristicCost[start.getAttribute('ref')]=0 //h(n)=0
    cost[end.getAttribute('ref')]=Number.MAX_VALUE
    heuristicCost[end.getAttribute('ref')]=Number.MAX_VALUE

    while(navigator.list.length>0){
        let x = navigator.pop();
        if(x[1].getAttribute('ref')===end.getAttribute('ref')){
            let route = [x[1].getAttribute('ref')];
            if(path[x[1].getAttribute('ref')]!==undefined){
                x[1] = path[x[1].getAttribute('ref')];
                route.push(x[1]);
            }
            while(path[x[1]]!==undefined){
                x[1] = path[x[1]];
                route.push(x[1]);
            }
            route.reverse();
            let recon = [];
            for(let i = 0; i<route.length; i++){
                recon.push(nodes[route[i]][0]);
                if(i<route.length-1){ //reconstruct route by finding nodes along the way
                    cache[route[i]].forEach(e => {
                        if(e[0].getAttribute('ref')===route[i+1]){
                            e[1].forEach(f => {
                                recon.push(f);
                            });
                        }
                    });
                }
            }
            return recon;
        }
        if(cache[x[1].getAttribute('ref')]===undefined){
            cache[x[1].getAttribute('ref')] = extendedMovementOptions(nodes[x[1].getAttribute('ref')],end);
        }
        let n = cache[x[1].getAttribute('ref')];
        for(let i = 0; i<n.length; i++){
            let dist = 0; //dist takes every node along the way into account, more than junctions
            if(n[i][1].length===0){
                dist = getGeoDistance(getNodeLatLong(x[1]),getNodeLatLong(n[i][0]));
            }else{
                dist = getGeoDistance(getNodeLatLong(x[1]),getNodeLatLong(n[i][1][0])) + getGeoDistance(getNodeLatLong(n[i][1][n[i][1].length-1]),getNodeLatLong(n[i][0]));
                for(let j = 1; j<n[i][1].length; j++){
                    dist += getGeoDistance(getNodeLatLong(n[i][1][j-1]),getNodeLatLong(n[i][1][j]));
                }
            }
            let k = cost[x[1].getAttribute('ref')] + dist; //dist is the length
            if(k<cost[n[i][0].getAttribute('ref')]){
                path[n[i][0].getAttribute('ref')] = x[1].getAttribute('ref');
                cost[n[i][0].getAttribute('ref')] = k;
                heuristicCost[n[i][0].getAttribute('ref')] = k + 0; //h(n)=0
                let b = true;
                for(let j = 0; j<navigator.list.length; j++){
                    if(navigator.list[j][1].getAttribute('ref')===n[i][0].getAttribute('ref')){
                        b = false;
                        break;
                    }
                }
                if(b){
                    navigator.push([heuristicCost[n[i][0].getAttribute('ref')],n[i][0]]);
                }
            }
        }
    }

    return false;
}

let teams = [new Team('Red',0),new Team('Blue',240)];
let forts = [new FortPiece('Fort Kominato',nodes['4413110877'][0],teams[0]),new FortPiece('Fort Miyanohama',nodes['4411502339'][0],teams[1])];
let pieceId = 0;
let markers = L.layerGroup().addTo(map);
forts.forEach(v=>{
    v.marker.addTo(markers);
    v.marker.getElement().style.background='none';
    v.marker.getElement().style.border='none';
    v.marker.getElement().children[0].remove();
});
let testMarkers = L.layerGroup().addTo(map);
let action = null;
let focus = null;
let pieces = [];
let playerTeam = 0; //EXPERIMENTAL
let updater = setInterval(function(){pieces.forEach(v=>{if(!v.dead){v.update();}});pieces=pieces.filter(v=>!v.dead)},100); //once per 100ms
Array.from(document.getElementById('action').children).forEach(e=>{
    e.addEventListener('click',f=>{
        Array.from(document.getElementById('action').children).forEach(g=>{g.classList.remove('action-active')});
        f.target.classList.add('action-active');
    });
});
document.getElementById('action-select').addEventListener('click',e=>{action='select';focus=null;});
document.getElementById('action-add').addEventListener('click',e=>{action='add';focus=null;});
document.getElementById('action-move').addEventListener('click',e=>{action='move';focus=null;});
document.getElementById('ambiguity-cancel').addEventListener('click',e=>{
    document.getElementById('ambiguity').style.display = 'none';
});
document.getElementById('ambiguity-confirm').addEventListener('click',e=>{
    let t = Array.from(document.getElementById('ambiguity-list').children).filter(v=>v.classList.contains('ambiguity-active'));
    if(t.length===1){
        focus = pieces.filter(v=>String(v.pieceId)===t[0].innerHTML)[0];
        document.getElementById('ambiguity').style.display = 'none';
    }
});
map.on('click',function(e){
    switch (action) {
        case 'add':
            pieces.push(new InfantryPiece(pieceId,getNearestNode([e.latlng['lat'],e.latlng['lng']]),getIcon('soldier.png',teams[playerTeam].hue),teams[playerTeam])); //EXPERIMENTAL
            let m = pieces[pieces.length-1].marker;
            m.on('click',f=>{
                if(action!=='add'){
                    let occupants = pieces.filter(v=>v.node.getAttribute('ref')===f.target.piece.node.getAttribute('ref'));
                    if(occupants.length===1){
                        focus = f.target.piece;
                    }else{
                        document.getElementById('ambiguity-list').innerHTML = occupants.map(v=>`<li>${v.pieceId}</li>`).join('');
                        Array.from(document.getElementById('ambiguity-list').children).forEach(v=>{
                            v.addEventListener('click',w=>{
                                Array.from(document.getElementById('ambiguity-list').children).forEach(u=>{u.classList.remove('ambiguity-active')});
                                w.target.classList.add('ambiguity-active');
                            });
                        });
                        document.getElementById('ambiguity').style.display = 'block';
                    }
                }
            });
            m.addTo(markers);
            m.getElement().style.background = 'none';
            m.getElement().style.border = 'none';
            pieceId++;
            break;
        case 'move':
            if(focus!==null){
                focus.follow(pathFinder(focus.node,getNearestNode([e.latlng['lat'],e.latlng['lng']])));
            }
            break;
        default: //what else?
            break;
    }
});
