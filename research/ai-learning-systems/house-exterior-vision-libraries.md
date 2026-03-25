# House Exterior Analysis: Computer Vision Libraries

> Research by Manus AI | Task ID: `fj7EfG2Tw68ty4zczvaa78`

## Summary: What to Use for Each Task

| Task | Best Library | Training Needed? | Accuracy |
|------|--------------|------------------|----------|
| **Object Detection** (doors, windows, garage) | YOLOv8 or Detectron2 | Yes — fine-tune on 500-2000 house photos | 85-95% with fine-tuning |
| **Depth Estimation** | ZoeDepth or MiDaS | No — pre-trained works | Good relative depth, ~10-15% error for metric |
| **Measurement Estimation** | Custom code + reference objects | No AI — just math | ±10-20% with door reference |
| **Edge Detection** | HED or PiDiNet | No — pre-trained works | Clean architectural lines |

---

## 1. Object Detection on Houses

### Option A: YOLOv8 (Recommended for Speed)

**What it does**: Detects objects in images with bounding boxes

**Pre-trained?**: Yes, but needs fine-tuning for architectural features

**Accuracy**: 85-95% mAP after fine-tuning on 500-2000 house images

```python
from ultralytics import YOLO

# Load pre-trained model
model = YOLO('yolov8n.pt')

# Fine-tune on your house dataset
model.train(
    data='houses.yaml',  # Your labeled data
    epochs=100,
    imgsz=640
)

# Use it
results = model.predict('house_photo.jpg')
for box in results[0].boxes:
    print(f"{box.cls}: {box.xyxy}")  # door: [x1, y1, x2, y2]
```

### Option B: Detectron2 (More Accurate, Slower)

**What it does**: Facebook's detection library, supports instance segmentation

**Pre-trained?**: Yes, needs fine-tuning

**Accuracy**: Slightly better than YOLO for complex scenes

```python
from detectron2.engine import DefaultPredictor
from detectron2.config import get_cfg
from detectron2 import model_zoo

cfg = get_cfg()
cfg.merge_from_file(model_zoo.get_config_file(
    "COCO-Detection/faster_rcnn_R_50_FPN_3x.yaml"
))
cfg.MODEL.WEIGHTS = "path/to/your/trained/model.pth"

predictor = DefaultPredictor(cfg)
outputs = predictor(image)
```

### Architectural Datasets for Training

- **HomeObjects-3K**: 3,000 home-related object images
- **DoorDet**: Specialized door detection dataset
- **Roboflow Universe**: Search "house" or "architectural" for community datasets

---

## 2. Depth Estimation from Single Image

### Option A: ZoeDepth (Best for Metric Depth)

**What it does**: Estimates actual distances (in meters) from a single photo

**Pre-trained?**: Yes — works out of the box, no training needed

**Accuracy**: ~10-15% relative error for indoor/outdoor scenes

```python
import torch

model = torch.hub.load(
    "isl-org/ZoeDepth", 
    "ZoeD_NK", 
    pretrained=True
)

depth_map = model.infer_pil(image)  # Returns depth in meters
```

### Option B: MiDaS (Best for Relative Depth)

**What it does**: Estimates relative depth (what's closer/farther)

**Pre-trained?**: Yes — no training needed

**Accuracy**: Excellent for relative ordering, not metric distances

```python
import torch

model = torch.hub.load("intel-isl/MiDaS", "DPT_Large")
transform = torch.hub.load("intel-isl/MiDaS", "transforms").dpt_transform

input_batch = transform(image)
with torch.no_grad():
    depth = model(input_batch)

# depth is a grayscale image: white = close, black = far
```

### Architectural Considerations

- Depth estimation works best with **clear, front-facing photos**
- Performance degrades with **extreme angles** or **heavy occlusion**
- For best results, combine with reference object measurements

---

## 3. Measurement Estimation

### Technique A: Reference Object Scaling (Simplest)

**How it works**: Use a known object (door = 3ft wide) to calculate scale

**Training needed?**: No — just math

**Accuracy**: ±10-20% depending on photo angle

```python
def estimate_measurements(detected_objects, image_width_px):
    # Standard door width in feet
    DOOR_WIDTH_FT = 3.0
    
    # Get door width in pixels from detection
    door = detected_objects['door']
    door_width_px = door['x2'] - door['x1']
    
    # Calculate scale: feet per pixel
    scale = DOOR_WIDTH_FT / door_width_px
    
    # Estimate house width
    house_width_ft = image_width_px * scale
    
    return {
        'scale_ft_per_px': scale,
        'house_width_ft': house_width_ft,
        'confidence': 'medium'  # ±15%
    }
```

### Technique B: Vanishing Point Analysis (More Accurate)

**How it works**: Uses perspective geometry to estimate real dimensions

**Training needed?**: No — geometric algorithms

**Accuracy**: ±5-10% with good vanishing point detection

```python
import cv2
import numpy as np

def find_vanishing_points(image):
    # Detect lines
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    edges = cv2.Canny(gray, 50, 150)
    lines = cv2.HoughLinesP(edges, 1, np.pi/180, 100)
    
    # Group lines by angle to find vanishing points
    # (Simplified — real implementation is more complex)
    horizontal_lines = [l for l in lines if is_horizontal(l)]
    vertical_lines = [l for l in lines if is_vertical(l)]
    
    vp_horizontal = intersect_lines(horizontal_lines)
    vp_vertical = intersect_lines(vertical_lines)
    
    return vp_horizontal, vp_vertical

def estimate_dimension_from_vp(vp, known_ref, unknown_segment):
    # Single View Metrology formula
    # Uses cross-ratio to estimate real-world dimensions
    pass
```

---

## 4. Architectural Feature Detection

### Specialized Models

| Model/Dataset | What It Detects | Source |
|--------------|-----------------|--------|
| **ArcGIS Building Footprint** | Building outlines from aerial | Esri pre-trained |
| **Roboflow Architecture Sets** | Doors, windows, facades | Community datasets |
| **Facade Parsing Models** | Detailed facade segmentation | Academic research |

### Facade Segmentation Example

```python
# Using a facade segmentation model
from transformers import SegformerForSemanticSegmentation

model = SegformerForSemanticSegmentation.from_pretrained(
    "nvidia/segformer-b5-finetuned-cityscapes-1024-1024"
)

# Fine-tune on architectural dataset for:
# - Wall regions
# - Window regions  
# - Door regions
# - Roof regions
```

---

## 5. Edge Detection for Outlines

### Option A: OpenCV Canny (Classic, Fast)

**What it does**: Finds edges using gradient detection

**Pre-trained?**: No — it's an algorithm, not AI

**Quality**: Good for simple outlines, can be noisy

```python
import cv2

image = cv2.imread('house.jpg', cv2.IMREAD_GRAYSCALE)
edges = cv2.Canny(image, threshold1=100, threshold2=200)

cv2.imwrite('house_outline.png', edges)
```

### Option B: HED - Holistically-Nested Edge Detection (Best Quality)

**What it does**: Deep learning edge detection, cleaner lines

**Pre-trained?**: Yes — works out of the box

**Quality**: Much cleaner, more continuous architectural lines

```python
import cv2

# Load pre-trained HED model
net = cv2.dnn.readNetFromCaffe(
    'deploy.prototxt', 
    'hed_pretrained_bsds.caffemodel'
)

blob = cv2.dnn.blobFromImage(
    image, 
    scalefactor=1.0, 
    size=(500, 500),
    mean=(104.00698793, 116.66876762, 122.67891434),
    swapRB=False, 
    crop=False
)

net.setInput(blob)
edges = net.forward()
```

### Option C: PiDiNet (Newest, Fastest Deep Learning)

**What it does**: Fast, accurate edge detection

**Pre-trained?**: Yes

**Quality**: Comparable to HED, faster inference

```python
from pidinet import PiDiNet

model = PiDiNet.from_pretrained('table5_pidinet')
edges = model.predict(image)
```

---

## Recommended Stack for House Exterior Analysis

```
┌─────────────────────────────────────────────────────────────┐
│               RECOMMENDED ARCHITECTURE                      │
│                                                             │
│   Photo Input                                               │
│       │                                                     │
│       ▼                                                     │
│   ┌─────────────────────────────────────┐                  │
│   │ YOLOv8 (fine-tuned on houses)       │                  │
│   │ → Detects: door, windows, garage    │                  │
│   └─────────────────────────────────────┘                  │
│       │                                                     │
│       ▼                                                     │
│   ┌─────────────────────────────────────┐                  │
│   │ Reference Object Scaling            │                  │
│   │ → door width (3ft) calculates scale │                  │
│   └─────────────────────────────────────┘                  │
│       │                                                     │
│       ▼                                                     │
│   ┌─────────────────────────────────────┐                  │
│   │ HED or PiDiNet                       │                  │
│   │ → Clean architectural outline        │                  │
│   └─────────────────────────────────────┘                  │
│       │                                                     │
│       ▼                                                     │
│   ┌─────────────────────────────────────┐                  │
│   │ ZoeDepth (optional)                  │                  │
│   │ → Depth map for 3D understanding     │                  │
│   └─────────────────────────────────────┘                  │
│       │                                                     │
│       ▼                                                     │
│   Output: Measured outline + detected features             │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Training Data Requirements

| Model | Photos Needed | Labeling Work |
|-------|---------------|---------------|
| YOLOv8 | 500-2000 | Draw boxes around doors, windows, etc. |
| ZoeDepth | 0 | Pre-trained, no labeling |
| HED | 0 | Pre-trained, no labeling |
| Measurement | 0 | Just code, no training |

**Total labeling work**: ~500-2000 photos with bounding boxes

**Labeling tools**: 
- [LabelImg](https://github.com/tzutalin/labelImg) — free, simple
- [Roboflow](https://roboflow.com) — free tier, web-based
- [CVAT](https://cvat.org) — free, advanced features
