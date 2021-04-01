import { Component, ViewChild, ElementRef, AfterViewInit, HostListener, Output, EventEmitter } from '@angular/core';
import { fabric } from 'fabric';

@Component({
  selector: 'angular-editor-fabric-js',
  templateUrl: './angular-editor-fabric-js.component.html',
  styleUrls: ['./angular-editor-fabric-js.component.css'],
})

export class FabricjsEditorComponent implements AfterViewInit {
  @ViewChild('htmlCanvas') htmlCanvas: ElementRef;
  @Output() updateActiveTool = new EventEmitter<string>();

  updateTool(value: string) {
    this.updateActiveTool.emit(value);
  }

  private canvas: fabric.Canvas;
  public props = {
    canvasFill: '#ffffff',
    canvasImage: '',
    id: null,
    opacity: null,
    fill: null,
    fontSize: null,
    lineHeight: null,
    charSpacing: null,
    fontWeight: null,
    fontStyle: null,
    textAlign: null,
    fontFamily: null,
    TextDecoration: ''
  };

  public textString: string;
  public url: string | ArrayBuffer = '';

  public json: any;
  public selected: any;
  public origX: any;
  public origY: any;

  public activeSelection = null;
  public isDrawingLineMode = false;
  public isDrawingPathMode = false;
  public isDrawingTextMode = false;
  public activeTool = null;

  public drawingObject: any = null;

  public isDrawingPath = false;
  public pathToDraw;
  public updatedPath;
  public isMouseDown = false;
  public isDrawingCurve = false;
  public rememberX;
  public rememberY;

  getCanvasWidthAndHeight = () => {
    return {
      // width: document.getElementById('canvasContainer').offsetWidth,
      // height: document.getElementById('canvasContainer').offsetHeight
      width: 1024,
      height: 768
    }
  }

  public size: any = this.getCanvasWidthAndHeight();

  @HostListener('document:keydown', ['$event'])
  handleKeyboardEvent(event: any) {
    switch (event.key) {
      case 'Delete':
        if (event.target.nodeName !== "TEXTAREA" && event.target.nodeName !== "INPUT") {
          this.canvas.getActiveObjects().forEach(obj => {
            this.canvas.remove(obj);
          });
          this.canvas.discardActiveObject().requestRenderAll();
          this.canvas.trigger('object:modified');
        }
        break;
      case 'Escape':
        if (this.isDrawingPath) {
          this.cancelPathDrawing();
        } else {
          this.cancelDrawing();
        }
        break;
      default:
        break;
    }
  }

  @HostListener('window:resize', ['$event'])
  onResize(event) {
    this.size = this.getCanvasWidthAndHeight();
    this.setCanvasSize();
  }

  public minZoom = 0.05;
  public maxZoom = 3;

  @HostListener('mousewheel', ['$event'])
  mouseZoom(e) {
    // if (!e.ctrlKey) return;
    e.preventDefault()
  
    let updatedZoom: any = this.canvas.getZoom().toFixed(2)
    let zoomAmount: any = (e.deltaY > 0) ? -5 : 5;
    updatedZoom = ((updatedZoom * 100) + zoomAmount) / 100
    if (updatedZoom < this.minZoom || updatedZoom > this.maxZoom) return;
    this.applyZoom(updatedZoom);
  }

  applyZoom = (zoom) => {
    this.canvas.setZoom(zoom);
    this.canvas.setWidth(this.size.width * this.canvas.getZoom());
    this.canvas.setHeight(this.size.height * this.canvas.getZoom());
  }

  constructor() { }

  cancelDrawing = () => {
    this.resetSelection();
    this.drawingObject = null;
    this.setActiveTool('select');
  }

  resetSelection() {
    this.origX = null;
    this.origY = null;
  }

  inRange = (radius, cursorX, cursorY, targetX, targetY) => {
    if (
      Math.abs(cursorX - targetX) <= radius &&
      Math.abs(cursorY - targetY) <= radius
    ) {
      return true
    }

    return false
  }

  setCanvasSize = () => {
    this.canvas.setWidth(this.size.width);
    this.canvas.setHeight(this.size.height);
  }

  ngAfterViewInit(): void {

    // setup front side canvas
    this.canvas = new fabric.Canvas(this.htmlCanvas.nativeElement, {
      hoverCursor: 'pointer',
      selection: true,
      selectionBorderColor: 'blue',
      preserveObjectStacking: true,
      svgViewportTransformation: false
    });

    fabric.Object.prototype.transparentCorners = false;
    fabric.Object.prototype.cornerStyle = 'circle';
    fabric.Object.prototype.borderColor = '#C00000';
    fabric.Object.prototype.cornerColor = '#C00000';
    fabric.Object.prototype.cornerStrokeColor = '#FFF';
    fabric.Object.prototype.padding = 0;

    this.canvas.on({
      'mouse:down': (o) => {
        let inst = this;
        let pointer = inst.canvas.getPointer(o.e);
        this.origX = pointer.x;
        this.origY = pointer.y;
        switch (this.activeTool) {
          case 'rect':
            this.drawingObject = new fabric.Rect({
              left: this.origX,
              top: this.origY,
              width: pointer.x - this.origX,
              height: pointer.y - this.origY,
              noScaleCache: false,
              strokeUniform: true,
            });
            this.extend(this.drawingObject, this.randomId());
            inst.canvas.add(this.drawingObject);
            break;
          case 'line':
            let pointerPoints = [this.origX, this.origY, this.origX, this.origY];
            this.drawingObject = new fabric.Line(pointerPoints, {
              strokeWidth: 1,
              stroke: '#000000'
            });
            this.drawingObject.strokeUniform = true;
            this.extend(this.drawingObject, this.randomId());
            inst.canvas.add(this.drawingObject);
            break;
          case 'path':
            this.isMouseDown = true;
            this.isDrawingPath = true;

            // if first point, no extras, just place the point
            if (!this.drawingObject) {
              this.drawingObject = new fabric.Path(`M${pointer.x} ${pointer.y} L${pointer.x} ${pointer.y}`, {
                strokeWidth: 1,
                stroke: '#000000',
                fill: 'transparent'
              });

              this.drawingObject.selectable = false;
              this.drawingObject.evented = false;
              this.drawingObject.strokeUniform = true;
              inst.canvas.add(this.drawingObject);

              return
            }

            // not the first point, add a new line
            if (this.drawingObject) {
              this.drawingObject.path.push(['L', pointer.x, pointer.y])

              // recalc path dimensions
              let dims = this.drawingObject._calcDimensions()
              this.drawingObject.set({
                width: dims.width,
                height: dims.height,
                left: dims.left,
                top: dims.top,
                pathOffset: {
                  x: dims.width / 2 + dims.left,
                  y: dims.height / 2 + dims.top
                },
                dirty: true
              });

              this.drawingObject.setCoords();
              inst.canvas.renderAll();

              return
            }
            break;
          case 'textbox':
            this.drawingObject = new fabric.Rect({
              left: this.origX,
              top: this.origY,
              width: pointer.x - this.origX,
              height: pointer.y - this.origY,
              strokeWidth: 1,
              stroke: '#C00000',
              fill: 'rgba(192, 0, 0, 0.2)',
              transparentCorners: false
            });
            this.canvas.add(this.drawingObject);
            break;
          default:
            break;
        }
      },
      'mouse:move': (o: any) => {
        if (!this.drawingObject) return;
        let inst = this;
        let pointer = inst.canvas.getPointer(o.e);

        switch (this.activeTool) {
          case 'rect':
            this.drawingObject.stroke = '#000';
            this.drawingObject.strokeWidth = 1;
            this.drawingObject.fill = 'transparent';

            if (this.origX > pointer.x) {
              this.drawingObject.set({
                left: Math.abs(pointer.x)
              });
            }
            if (this.origY > pointer.y) {
              this.drawingObject.set({
                top: Math.abs(pointer.y)
              });
            }

            this.drawingObject.set({
              width: Math.abs(this.origX - pointer.x),
              height: Math.abs(this.origY - pointer.y)
            });

            this.drawingObject.setCoords();
            inst.canvas.renderAll();
            break;
          case 'line':
            if (o.e.shiftKey) {
              // calc angle
              let startX = this.origX;
              let startY = this.origY;
              let x2 = pointer.x - this.origX
              let y2 = pointer.y - this.origY
              let r = Math.sqrt(x2 * x2 + y2 * y2)
              let angle: any = (Math.atan2(y2, x2) / Math.PI * 180)

              angle = (((angle + 7.5) % 360) / 15) * 15;

              let cosx = r * Math.cos(angle * Math.PI / 180)
              let sinx = r * Math.sin(angle * Math.PI / 180)

              this.drawingObject.set({
                x2: cosx + this.origX,
                y2: sinx + this.origY
              })

            } else {
              this.drawingObject.set({
                x2: pointer.x,
                y2: pointer.y
              })
            }
            inst.canvas.renderAll();
            break;
          case 'path':
            if (!this.isDrawingPath) return

            // update the last path command as we move the mouse
            pointer = inst.canvas.getPointer(o.e)

            if (!this.isDrawingCurve) {
              this.updatedPath = ['L', pointer.x, pointer.y]
            }

            this.drawingObject.path.pop()


            // shift key is down, jump angles
            if (o.e.shiftKey && !this.isDrawingCurve) {
              // last fix, placed point
              let lastPoint = [...this.drawingObject.path].pop()
              let startX = lastPoint[1]
              let startY = lastPoint[2]

              let x2 = pointer.x - startX
              let y2 = pointer.y - startY
              let r = Math.sqrt(x2 * x2 + y2 * y2)
              let angle: any = (Math.atan2(y2, x2) / Math.PI * 180)

              angle = (((angle + 7.5) % 360) / 15) * 15;

              let cosx = r * Math.cos(angle * Math.PI / 180)
              let sinx = r * Math.sin(angle * Math.PI / 180)

              this.updatedPath[1] = cosx + startX
              this.updatedPath[2] = sinx + startY
            }


            // detect and snap to closest line if within range
            if (this.drawingObject.path.length > 1 && !this.isDrawingCurve) {
              // foreach all points, except last
              let snapPoints = [...this.drawingObject.path]
              snapPoints.pop()
              for (let p of snapPoints) {
                // line
                if ((p[0] === 'L' || p[0] === 'M') && this.inRange(10, pointer.x, pointer.y, p[1], p[2])) {
                  this.updatedPath[1] = p[1]
                  this.updatedPath[2] = p[2]
                  break
                }

                // curve
                if (p[0] === 'Q' && this.inRange(10, pointer.x, pointer.y, p[3], p[4])) {
                  this.updatedPath[1] = p[3]
                  this.updatedPath[2] = p[4]
                  break
                }

              }
            }

            // curve creating
            if (this.isMouseDown) {

              if (!this.isDrawingCurve && this.drawingObject.path.length > 1) {

                this.isDrawingCurve = true

                // get last path position and remove last path so we can update it
                let lastPath = this.drawingObject.path.pop()

                if (lastPath[0] === 'Q') {
                  this.updatedPath = ['Q', lastPath[3], lastPath[4], lastPath[3], lastPath[4]]
                  this.rememberX = lastPath[3]
                  this.rememberY = lastPath[4]
                } else {
                  this.updatedPath = ['Q', lastPath[1], lastPath[2], lastPath[1], lastPath[2]]
                  this.rememberX = lastPath[1]
                  this.rememberY = lastPath[2]
                }

              } else if (this.isDrawingCurve) {

                // detect mouse move and calc Q position
                let mouseMoveX = pointer.x - this.updatedPath[3]
                let mouseMoveY = pointer.y - this.updatedPath[4]

                this.updatedPath = [
                  'Q',
                  this.rememberX - mouseMoveX,
                  this.rememberY - mouseMoveY,
                  this.rememberX,
                  this.rememberY
                ]

              }

            }

            // add new path
            this.drawingObject.path.push(this.updatedPath)

            // recalc path dimensions
            let dims = this.drawingObject._calcDimensions();
            this.drawingObject.set({
              width: dims.width,
              height: dims.height,
              left: dims.left,
              top: dims.top,
              pathOffset: {
                x: dims.width / 2 + dims.left,
                y: dims.height / 2 + dims.top
              },
              dirty: true
            })
            inst.canvas.renderAll()
            break;
          case 'textbox':
            if (this.origX > pointer.x) {
              this.drawingObject.set({
                left: Math.abs(pointer.x)
              });
            }

            if (this.origY > pointer.y) {
              this.drawingObject.set({
                top: Math.abs(pointer.y)
              });
            }

            this.drawingObject.set({
              width: Math.abs(this.origX - pointer.x)
            });
            this.drawingObject.set({
              height: Math.abs(this.origY - pointer.y)
            });

            this.canvas.renderAll();
            break;
          default:
            break;
        }

      },
      'mouse:up': (o: any) => {
        switch (this.activeTool) {
          case 'path':
            this.isMouseDown = false;

            if (this.isDrawingCurve) {
              // place current curve by starting a new line
              let pointer = this.canvas.getPointer(o.e);
              this.drawingObject.path.push(['L', pointer.x, pointer.y])

              // recalc path dimensions
              let dims = this.drawingObject._calcDimensions()
              this.drawingObject.set({
                width: dims.width,
                height: dims.height,
                left: dims.left,
                top: dims.top,
                pathOffset: {
                  x: dims.width / 2 + dims.left,
                  y: dims.height / 2 + dims.top
                },
                dirty: true
              })
              this.drawingObject.setCoords()
              this.canvas.renderAll()
            }

            this.isDrawingCurve = false;
            break;
          case 'textbox':
            let textbox = new fabric.Textbox('Your text goes here...', {
              left: this.drawingObject.left,
              top: this.drawingObject.top,
              width: this.drawingObject.width < 80 ? 80 : this.drawingObject.width,
              fontSize: 18,
              fontFamily: "'Open Sans', sans-serif"
            });
            this.canvas.remove(this.drawingObject);
            this.canvas.add(textbox);
            this.canvas.setActiveObject(textbox);
            textbox.setControlsVisibility({
              'mb': false
            });
            break;
          default:
            this.drawingObject = null;
            break;
        }
      },
      'object:moving': (e: any) => { },
      'object:modified': (e: any) => { },
      'object:scaling': (e: any) => { },
      'selection:created': (e: any) => this.setActiveSelection(e.target),
      'selection:updated': (e: any) => this.setActiveSelection(e.target),
      'selection:cleared': (e: any) => this.setActiveSelection(null),
      'object:rotating': (e: any) => {
        if (e.e.shiftKey) {
          e.target.snapAngle = 15;
        } else {
          e.target.snapAngle = false;
        }
      }
    });

    this.setCanvasSize();

    // let options = {
    //   distance: 10,
    //   width: this.canvas.getWidth(),
    //   height: this.canvas.getHeight(),
    //   param: {
    //     stroke: '#ebebeb',
    //     strokeWidth: 1,
    //     selectable: false,
    //     excludeFromExport: true,
    //   }
    // };

    // let gridLen = options.width / options.distance;

    // for (var i = 0; i < gridLen; i++) {
    //   var distance = i * options.distance,
    //     horizontal = new fabric.Line([distance, 0, distance, options.width], options.param),
    //     vertical = new fabric.Line([0, distance, options.width, distance], options.param);
    //   this.canvas.add(horizontal);
    //   this.canvas.add(vertical);
    //   if (i % 5 === 0) {
    //     horizontal.set({ stroke: '#cccccc' });
    //     vertical.set({ stroke: '#cccccc' });
    //   };
    // };

    // get references to the html canvas element & its context
    // this.canvas.on('mouse:down', (e) => {
    //   const canvasElement: any = document.getElementById('canvas');
    // });

  }

  cancelPathDrawing = () => {
    // remove last line
    this.drawingObject.path.pop()

    if (this.drawingObject.path.length > 1) {

      let dims = this.drawingObject._calcDimensions();
      this.drawingObject.set({
        width: dims.width,
        height: dims.height,
        left: dims.left,
        top: dims.top,
        pathOffset: {
          x: dims.width / 2 + dims.left,
          y: dims.height / 2 + dims.top
        },
        dirty: true
      })

    } else {
      // if there is no line, just the starting point then remove
      this.canvas.remove(this.drawingObject);
    }

    this.canvas.renderAll();
    this.drawingObject = null
    this.isDrawingPath = false;
  }

  setActiveSelection = (activeSelection) => {
    this.activeSelection = activeSelection;
    this.setActiveTool('select');
  }

  changeSize() {
    this.canvas.setWidth(this.size.width);
    this.canvas.setHeight(this.size.height);
  }

  getImgPolaroid(event: any) {
    const el = event.target;
    fabric.loadSVGFromURL(el.src, (objects, options) => {
      const image = fabric.util.groupSVGElements(objects, options);
      image.set({
        left: 10,
        top: 10,
        angle: 0,
        padding: 10,
        cornerSize: 10,
        hasRotatingPoint: true,
      });
      this.extend(image, this.randomId());
      this.canvas.add(image);
      this.canvas.setActiveObject(image);
    });
  }

  addImageOnCanvas(url) {
    if (url) {
      fabric.Image.fromURL(url, (image) => {
        image.set({
          left: 10,
          top: 10,
          angle: 0,
          padding: 10,
          cornerSize: 10,
          hasRotatingPoint: true
        });
        image.scaleToWidth(200);
        image.scaleToHeight(200);
        this.extend(image, this.randomId());
        this.canvas.add(image);
        this.canvas.setActiveObject(image);
      });
    }
  }

  readUrl(event) {
    if (event.target.files && event.target.files[0]) {
      const reader = new FileReader();
      reader.onload = (readerEvent) => {
        this.url = readerEvent.target.result;
      };
      reader.readAsDataURL(event.target.files[0]);
    }
  }

  removeWhite(url) {
    this.url = '';
  }

  extend(obj, id) {
    obj.toObject = ((toObject) => {
      return function () {
        return fabric.util.object.extend(toObject.call(this), {
          id
        });
      };
    })(obj.toObject);
  }

  randomId() {
    return Math.floor(Math.random() * 999999) + 1;
  }

  confirmClear() {
    if (confirm('Are you sure?')) {
      this.canvas.clear();
    }
  }

  rasterize() {
    var data = this.canvas.toDataURL();
    var mimeType = 'image/png';
    var extension = 'png'
    const imageData = data.toString().replace(/^data:image\/(png|jpeg|jpg);base64,/, '');
    const byteCharacters = atob(imageData);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i += 1) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const file = new Blob([byteArray], {
      type: mimeType + ';base64'
    });
    const fileURL = window.URL.createObjectURL(file);

    // IE doesn't allow using a blob object directly as link href
    // instead it is necessary to use msSaveOrOpenBlob
    if (window.navigator && window.navigator.msSaveOrOpenBlob) {
      window.navigator.msSaveOrOpenBlob(file);
      return;
    }
    const link = document.createElement('a');
    link.href = fileURL;
    link.download = 'image.' + extension;
    link.dispatchEvent(new MouseEvent('click'));
    setTimeout(() => {
      // for Firefox it is necessary to delay revoking the ObjectURL
      window.URL.revokeObjectURL(fileURL);
    }, 60);
  }

  rasterizeSVG() {
    var element = document.createElement('a');
    element.setAttribute('href', 'data:image/svg+xml;utf8,' + encodeURIComponent(this.canvas.toSVG()));
    element.setAttribute('download', "image.svg");
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);

  }

  saveCanvasToJSON() {
    const json = JSON.stringify(this.canvas);
    localStorage.setItem('Kanvas', json);
    console.log('json');
    console.log(json);
  }

  loadCanvasFromJSON() {
    const CANVAS = localStorage.getItem('Kanvas');
    console.log('CANVAS');
    console.log(CANVAS);

    // and load everything from the same json
    this.canvas.loadFromJSON(CANVAS, () => {
      console.log('CANVAS untar');
      console.log(CANVAS);

      // making sure to render canvas at the end
      this.canvas.renderAll();

      // and checking if object's "name" is preserved
      console.log('this.canvas.item(0).name');
      console.log(this.canvas);
    });

  }

  rasterizeJSON() {
    this.json = JSON.stringify(this.canvas, null, 2);
  }

  setActiveTool = (id) => {
    this.activeTool = id;
    this.updateTool(this.activeTool);
    
    if (id !== 'select') {
      this.canvas.discardActiveObject();
      this.canvas.renderAll();
      this.activeSelection = null;
    }

    this.isDrawingLineMode = false;
    this.isDrawingPathMode = false;
    this.canvas.isDrawingMode = false;
    this.isDrawingTextMode = false;

    this.canvas.defaultCursor = 'default';
    this.canvas.selection = true;

    this.canvas.forEachObject((o: any) => {
      if (!o.excludeFromExport) {
        o.selectable = true;
        o.evented = true;
      }
    });

    switch (id) {
      case 'draw':
        this.canvas.isDrawingMode = true;
        break;
      case 'line':
      case 'rect':
        this.canvas.defaultCursor = 'crosshair'
        this.canvas.selection = false
        this.canvas.forEachObject(o => {
          o.selectable = false
          o.evented = false
        });
        break;
      case 'path':
        this.isDrawingPathMode = true
        this.canvas.defaultCursor = 'crosshair'
        this.canvas.selection = false
        this.canvas.forEachObject(o => {
          o.selectable = false
          o.evented = false
        });
        break;
      case 'textbox':
        this.isDrawingTextMode = true
        this.canvas.defaultCursor = 'crosshair'
        this.canvas.selection = false
        this.canvas.forEachObject(o => {
          o.selectable = false
          o.evented = false
        });
        break;
      default:
        break;
    }
  }

  zoomFit = () => {
    this.canvas.setViewportTransform([1, 0, 0, 1, 0, 0]);
  }

  objectOption = (action: string) => {
    if (!this.activeSelection) return;
    switch (action) {
      case "flip-h":
        this.activeSelection.set('flipX', !this.activeSelection.flipX);
        this.canvas.renderAll();
        break;
      case "flip-v":
        this.activeSelection.set('flipY', !this.activeSelection.flipY);
        this.canvas.renderAll();
        break;
      case "bring-fwd":
        this.canvas.bringForward(this.activeSelection)
        this.canvas.renderAll();
        break;
      case "bring-back":
        this.canvas.sendBackwards(this.activeSelection)
        this.canvas.renderAll();
        break;
      case "duplicate":
        let clonedObjects = []
        let activeObjects = this.canvas.getActiveObjects()
        activeObjects.forEach(obj => {
          obj.clone(clone => {
            this.canvas.add(clone.set({
              strokeUniform: true,
              left: obj.aCoords.tl.x + 20,
              top: obj.aCoords.tl.y + 20
            }));

            if (activeObjects.length === 1) {
              this.canvas.setActiveObject(clone)
            }
            clonedObjects.push(clone)
          })
        })

        if (clonedObjects.length > 1) {
          let sel = new fabric.ActiveSelection(clonedObjects, {
            canvas: this.canvas,
          });
          this.canvas.setActiveObject(sel)
        }

        this.canvas.requestRenderAll();

        break;
      case "delete":
        this.canvas.getActiveObjects().forEach(obj => this.canvas.remove(obj))
        this.canvas.discardActiveObject().requestRenderAll();
        break;
    }
  }
}
