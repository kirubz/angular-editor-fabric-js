import { Component, ViewChild } from '@angular/core';
import { FabricjsEditorComponent } from 'projects/angular-editor-fabric-js/src/public-api';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})

export class AppComponent {
  title = 'angular-image-editor';
  activeTool = null;

  @ViewChild('canvas', {static: false}) canvas: FabricjsEditorComponent;

  public rasterize() {
    this.canvas.rasterize();
  }

  public rasterizeSVG() {
    this.canvas.rasterizeSVG();
  }

  public saveCanvasToJSON() {
    this.canvas.saveCanvasToJSON();
  }

  public loadCanvasFromJSON(event) {
    this.canvas.loadCanvasFromJSON(event);
  }

  public confirmClear() {
    this.canvas.confirmClear();
  }

  public getImgPolaroid(event) {
    this.canvas.getImgPolaroid(event);
  }

  public addImageOnCanvas(url) {
    this.canvas.addImageOnCanvas(url);
  }

  public readUrl(event) {
    this.canvas.readUrl(event);
  }

  public removeWhite(url) {
    this.canvas.removeWhite(url);
  }

  public rasterizeJSON() {
    this.canvas.rasterizeJSON();
  }

  public drawingTool(event: any){
    this.canvas.setActiveTool(event.target.id);
  }

  public objectOption(event: any){
    console.log(event.target.id);
    this.canvas.objectOption(event.target.id);
  }

  public zoomFit(){
    this.canvas.zoomFit();
  }

  public changeSize() {
    this.canvas.changeSize();
  }

  public setCanvasFill(event) {
    console.log(event.target.value);
    this.canvas.setCanvasFill(event.target.value);
  }

  public setStrokeColor(event) {
    this.canvas.setStrokeColor(event.target.value)
  }

  public setStrokeWidth(event) {
    this.canvas.setStrokeWidth(event.target.value)
  }
}
