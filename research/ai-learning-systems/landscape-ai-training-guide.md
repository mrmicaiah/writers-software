# Training a Custom Landscape Design AI Model

> Research by Manus AI | Task ID: `d2dMuwcihRDPtR9icoay5K`

## Executive Summary

**Best Approach**: ControlNet with Stable Diffusion (not Pix2Pix)
**Data Needed**: 200-500 paired before/after images (you have this!)
**Timeline**: 6-10 weeks to usable model
**Compute Budget**: Under $500

---

## Why ControlNet + Stable Diffusion (Not Pix2Pix)

| Factor | Pix2Pix | ControlNet + SD |
|--------|---------|------------------|
| **Training data needed** | 1000+ pairs | 200-500 pairs |
| **Output quality** | Often blurry | Photorealistic |
| **Flexibility** | Fixed output style | Can vary styles |
| **Pre-trained foundation** | None | Stable Diffusion knows plants, houses, textures |
| **Compute cost** | Higher | Lower |

ControlNet wins because Stable Diffusion already "knows" what hydrangeas, mulch, and houses look like. You're just teaching it YOUR design style.

---

## How ControlNet Works for Landscape Design

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│   1. Input: Before photo                                    │
│      ┌─────────────┐                                       │
│      │  [house]    │                                       │
│      └─────────────┘                                       │
│             │                                               │
│             ▼                                               │
│   2. ControlNet extracts structure                         │
│      (edges, depth, segmentation)                          │
│             │                                               │
│             ▼                                               │
│   3. Stable Diffusion generates landscaping                │
│      (guided by YOUR training examples)                    │
│             │                                               │
│             ▼                                               │
│   4. Output: After render                                  │
│      ┌─────────────┐                                       │
│      │  [house +   │                                       │
│      │   plants]   │                                       │
│      └─────────────┘                                       │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Training Data Preparation

### What You Need Per Project

```
project_001/
├── before.jpg      # Original house photo
├── after.jpg       # Your designed render
└── prompt.txt      # Description: "front yard landscaping with hydrangeas, mulch beds, boxwood borders"
```

### Image Requirements

| Requirement | Specification |
|-------------|---------------|
| **Format** | JPEG or PNG |
| **Size** | 512×512 or 768×768 (will be resized) |
| **Alignment** | Before/after should be same perspective |
| **Quantity** | 200-500 pairs minimum |

### Data Prep Script

```python
import os
from PIL import Image

def prepare_training_pair(before_path, after_path, output_dir, project_id):
    # Load images
    before = Image.open(before_path)
    after = Image.open(after_path)
    
    # Resize to 512x512
    before = before.resize((512, 512), Image.LANCZOS)
    after = after.resize((512, 512), Image.LANCZOS)
    
    # Save
    before.save(f"{output_dir}/{project_id}_before.jpg")
    after.save(f"{output_dir}/{project_id}_after.jpg")
    
    # Create prompt (you'd customize this per project)
    prompt = "professional landscape design with mulch beds, flowering shrubs, and foundation plantings"
    with open(f"{output_dir}/{project_id}_prompt.txt", "w") as f:
        f.write(prompt)
```

---

## Training Process

### Step 1: Set Up Environment

```bash
# Clone ControlNet training repo
git clone https://github.com/lllyasviel/ControlNet.git
cd ControlNet

# Install dependencies
pip install -r requirements.txt

# Download base Stable Diffusion model
wget https://huggingface.co/runwayml/stable-diffusion-v1-5/resolve/main/v1-5-pruned.ckpt
```

### Step 2: Prepare Dataset

```python
# Structure your data
dataset/
├── source/          # Before photos
│   ├── 001.jpg
│   ├── 002.jpg
│   └── ...
├── target/          # After renders
│   ├── 001.jpg
│   ├── 002.jpg
│   └── ...
└── prompts/         # Text descriptions
    ├── 001.txt
    ├── 002.txt
    └── ...
```

### Step 3: Train

```bash
python train.py \
    --data_path ./dataset \
    --output_dir ./trained_model \
    --epochs 100 \
    --batch_size 4 \
    --learning_rate 1e-5
```

### Step 4: Use Your Trained Model

```python
from controlnet import ControlNetPipeline

# Load your trained model
pipeline = ControlNetPipeline.from_pretrained("./trained_model")

# Generate landscaping for new photo
result = pipeline(
    image="new_house.jpg",
    prompt="professional landscape design with hydrangeas and mulch beds"
)
result.save("new_house_landscaped.jpg")
```

---

## Compute Requirements

### Option A: Cloud GPU (Recommended for Training)

| Provider | GPU | Cost | Training Time |
|----------|-----|------|---------------|
| **RunPod** | RTX 4090 | $0.44/hr | ~20-40 hours |
| **Lambda Labs** | A100 | $1.10/hr | ~10-20 hours |
| **Google Colab Pro** | A100 | $50/month | ~20-40 hours |
| **Vast.ai** | RTX 3090 | $0.30/hr | ~30-50 hours |

**Estimated total cost**: $50-200 for training

### Option B: Local (If You Have Gaming PC)

- RTX 3080 or better
- 24GB+ VRAM ideal (16GB workable)
- Training time: 40-80 hours
- Cost: Electricity only

---

## Realistic Timeline

| Week | Task |
|------|------|
| 1-2 | Gather and organize before/after pairs |
| 3 | Write prompts, resize images, prepare dataset |
| 4-5 | Set up training environment, run initial tests |
| 6-7 | Full training run |
| 8 | Evaluate results, adjust if needed |
| 9-10 | Build simple UI/API for using the model |

**Total**: 6-10 weeks to usable system

---

## Alternative: Fine-Tune Existing Tools

If training from scratch feels daunting, consider:

### Scenario.gg
- Upload your before/after pairs
- They handle training
- Monthly subscription
- Good for testing the concept

### Replicate Custom Models
- Upload training data
- Pay per training run
- API access to your model
- ~$50-100 to train

### DreamBooth / LoRA
- Lighter-weight training
- Teaches SD your "style" in 20-50 images
- Faster but less precise

---

## Recommendation for Your Business

### Phase 1: Proof of Concept (2-3 weeks)
1. Select 50 best before/after pairs
2. Use Replicate or Scenario.gg to train quickly
3. Test if output quality is acceptable
4. Cost: ~$100

### Phase 2: Full Training (4-6 weeks)
1. Prepare full dataset (200-500 pairs)
2. Train ControlNet model on cloud GPU
3. Build simple web UI for sales team
4. Cost: ~$200-400

### Phase 3: Production System (Ongoing)
1. Integrate into your workflow
2. Continuously add new designs to training data
3. Retrain periodically to improve
4. Add schematic drawing output

---

## Your Competitive Advantage

You have something most people don't:

| Asset | Value |
|-------|-------|
| **10 years of designs** | Training data is expensive/rare |
| **Consistent style** | AI will learn YOUR look |
| **Component library** | Plants, textures — consistent assets |
| **Documented rules** | Can validate AI output against principles |

This isn't just "using AI" — this is building a **proprietary AI system** that competitors can't replicate because they don't have your data.
