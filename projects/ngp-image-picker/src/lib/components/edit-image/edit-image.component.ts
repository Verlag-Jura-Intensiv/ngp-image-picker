import { Component, Input, OnInit, Output, EventEmitter, ChangeDetectorRef, AfterViewInit } from '@angular/core';
import { convertImageUsingCanvas, dragElement, MAX_BUFFER_UNDO_MEMORY, saveState } from '../../functions/image-processing';
import { IBasicFilterState, IState } from '../../models/index.models';
 import Croppr from '../../functions/croppr';

// const Croppr = require('../../services/croppr-service')
@Component({
  selector: 'lib-edit-image',
  templateUrl: './edit-image.component.html',
  styleUrls: ['./edit-image.component.scss'],
})
export class EditImageComponent implements OnInit, AfterViewInit {
  @Input() labels: any;
  @Input() imageSrc: string;
  @Input() color: string;
  controlPanelIndex: number = 0;
  showCrop: boolean = false;
  observer: ResizeObserver = null;
  allFormats = ['webp', 'jpeg', 'png'];

  @Input() initialState: IState | null | any = {};

  state: IState = {
    quality: 92,
    maxHeight: 1000,
    maxWidth: 1000,
    cropHeight: 150,
    cropWidth: 150,
    maintainAspectRatio: true,
    format: 'jpeg',
    arrayCopiedImages: [],
    originImageSrc: '',
  };

  @Output() closeModal = new EventEmitter<{ state: IState; imageSrc: string } | null | undefined>();

  constructor(private chRef: ChangeDetectorRef) {}

  ngOnInit() {
    this.state = JSON.parse(JSON.stringify({ ...this.state, ...this.initialState }));
    // console.log(this.state);
  }

  ngAfterViewInit(): void {
    var croppr = new Croppr('#croppr', {
      minSize: [32, 32, 'px'],
      startSize: [150, 150,'px'],
      onCropStart: (value: any) => {
        console.log(value.x, value.y, value.width, value.height);
      },
      onCropEnd: (value: any) => {
        console.log(value.x, value.y, value.width, value.height);
      },
    });
  }

  onCloseEditPanel(saveChanges: boolean = false) {
    if (this.observer instanceof ResizeObserver) {
      this.observer.unobserve(document.getElementById('image-croper'));
      this.observer.unobserve(document.getElementById('image-full'));
    }
    this.showCrop = false;
    if (saveChanges) this.closeModal.next({ state: this.state, imageSrc: this.imageSrc });
    else this.closeModal.next(null);
  }

  onControlPanelIndexChange(idex: number) {
    this.controlPanelIndex = idex;
  }

  calculateSize() {
    if (this.imageSrc && this.imageSrc.length) {
      return Math.ceil(((3 / 4) * this.imageSrc.length) / 1024);
    } else {
      return;
    }
  }

  async onChangeSize(changeHeight = false) {
    try {
      this.imageSrc = await convertImageUsingCanvas(this.state.originImageSrc, changeHeight, this.state);
      this.chRef.markForCheck();
    } catch (error) {
      console.log('🚀 ~ file: edit-image.component.ts ~ line 76 ~ EditImageComponent ~ onChangeSize ~ error', error);
      this.chRef.markForCheck();
    }
  }

  async onChangeQuality() {
    try {
      this.imageSrc = await convertImageUsingCanvas(this.state.originImageSrc, false, this.state);
      this.chRef.markForCheck();
    } catch (error) {
      console.log('🚀 ~ file: edit-image.component.ts ~ line 86 ~ EditImageComponent ~ onChangeQuality ~ error', error);
      this.chRef.markForCheck();
    }
  }

  async onChangeFormat() {
    try {
      this.imageSrc = await convertImageUsingCanvas(this.state.originImageSrc, false, this.state);
      this.chRef.markForCheck();
    } catch (error) {
      console.log('🚀 ~ file: edit-image.component.ts ~ line 98 ~ EditImageComponent ~ onChangeFormat ~ error', error);
      this.chRef.markForCheck();
    }
  }

  async onRestore() {
    try {
      if (this.state.arrayCopiedImages.length > 1) {
        this.state.arrayCopiedImages.pop();
        let newValue = this.state.arrayCopiedImages[this.state.arrayCopiedImages.length - 1];
        this.state = {
          ...this.state,
          maxHeight: newValue.height,
          maxWidth: newValue.width,
          quality: newValue.quality,
          format: newValue.format,
          originImageSrc: newValue.originImageSrc,
          basicFilters: newValue.basicFilters,
        };
        this.imageSrc = newValue.lastImage;
        this.chRef.markForCheck();
      }
    } catch (e) {
      console.log('🚀 ~ file: edit-image.component.ts ~ line 126 ~ EditImageComponent ~ onRestore ~ e', e);
    }
  }

  onCropStateChange() {
    const croper: any = document.getElementById('image-croper');
    const imageFull: any = document.getElementById('image-full');
    if (this.showCrop) {
      croper.style.opacity = '1.0';
      dragElement(croper);
      this.observer = new ResizeObserver((entries) => {
        entries.forEach((entry) => {
          const elemntCropper = document.getElementById('image-croper');
          const rectHolder = imageFull.getBoundingClientRect();
          const rectElemnt = elemntCropper.getBoundingClientRect();
          const maxWidth = rectHolder.x + rectHolder.width - rectElemnt.x - 1;
          const maxHeight = rectHolder.y + rectHolder.height - rectElemnt.y - 1;
          elemntCropper.style.maxWidth = maxWidth + 'px';
          elemntCropper.style.maxHeight = maxHeight + 'px';
          this.state.cropWidth = rectElemnt.width;
          this.state.cropHeight = rectElemnt.height;
          this.chRef.markForCheck();
          if (entry.target.id == 'image-full') {
            if (rectHolder.top > 0) {
              elemntCropper.style.top = rectHolder.top + 1 + 'px';
            }
            elemntCropper.style.left = rectHolder.left + 1 + 'px';
          }
        });
      });
      this.observer.observe(croper);
      this.observer.observe(imageFull);
      this.chRef.markForCheck();
    } else {
      croper.style.opacity = '0.0';
      if (this.observer instanceof ResizeObserver) {
        this.observer.unobserve(croper);
        this.observer.unobserve(imageFull);
      }
      this.chRef.markForCheck();
    }
  }

  onChangeCrop() {
    const croper = document.getElementById('image-croper');
    croper.style.width = this.state.cropWidth + 'px';
    croper.style.height = this.state.cropHeight + 'px';
  }

  onCrop() {
    const croper = document.getElementById('image-croper');
    const rectCroper = croper.getBoundingClientRect();
    const dataHolderRect = document.getElementById('image-full').getBoundingClientRect();
    const canvas = document.createElement('canvas');
    return new Promise((resolve, reject) => {
      let ctx = canvas.getContext('2d');
      let image = new Image();
      image.src = this.imageSrc;
      image.onload = () => {
        let ratio = image.height / dataHolderRect.height;
        let newWidth = rectCroper.width * ratio;
        let newHeight = rectCroper.height * ratio;
        canvas.height = newHeight;
        canvas.width = newWidth;
        ctx.drawImage(
          image,
          Math.abs(rectCroper.x * ratio) - Math.abs(dataHolderRect.x * ratio),
          Math.abs(rectCroper.y * ratio) - Math.abs(dataHolderRect.y * ratio),
          newWidth,
          newHeight,
          0,
          0,
          newWidth,
          newHeight,
        );
        return resolve(canvas.toDataURL(`image/${this.state.format}`, this.state.quality));
      };
      image.onerror = (e) => {
        reject(e);
      };
    })
      .then((dataUri: string) => {
        this.imageSrc = dataUri;
        this.showCrop = false;
        this.onCropStateChange();
        this.state.maxWidth = canvas.width;
        this.state.maxHeight = canvas.height;
        this.state.originImageSrc = dataUri;
        saveState(this.state, dataUri);
        this.chRef.markForCheck();
      })
      .catch((e) => {
        console.log(e);
      });
  }

  async onChangeFilters(data: IBasicFilterState) {
    try {
      if (!this.state.basicFilters) {
        this.state.basicFilters = data;
      } else {
        this.state.basicFilters = { ...this.state.basicFilters, ...data };
      }
      this.imageSrc = await convertImageUsingCanvas(this.state.originImageSrc, false, this.state);
      this.chRef.markForCheck();
    } catch (e) {
      console.log('🚀 ~ file: edit-image.component.ts ~ line 250 ~ EditImageComponent ~ onChangeFilters ~ e', e);
    }
  }

  // async onRotate(deg = 90) {
  //   try {
  //     this.imageSrc = await convertImageUsingCanvas(this.state.originImageSrc, false, this.state, { rotate: deg });
  //     this.chRef.markForCheck();
  //   } catch (e) {
  //     console.log('🚀 ~ file: edit-image.component.ts ~ line 250 ~ EditImageComponent ~ onRotate ~ e', e);
  //   }
  // }
}
