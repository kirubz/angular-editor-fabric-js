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

  public loadCanvasFromJSON() {
    this.canvas.loadCanvasFromJSON();
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
    console.log(event.target.id);
    this.activeTool = event.target.id;
    this.canvas.setActiveTool(this.activeTool);
  }

  updateActiveTool(activeTool: string) {
    console.log({activeTool});
    this.activeTool = activeTool;
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


}
