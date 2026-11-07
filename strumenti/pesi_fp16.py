"""Dimezza il peso di un modello ONNX: pesi salvati in float16, calcolo in float32.

Uso: python pesi_fp16.py <ingresso.onnx> <uscita.onnx>
Ogni peso float32 con più di 1024 valori viene salvato in float16 e riconvertito
da un nodo Cast all'avvio. ONNX Runtime ripiega i Cast sulle costanti all'apertura
della sessione, quindi il calcolo resta in float32 sia con WebGPU sia con WASM.
"""
import sys
import numpy as np, onnx
from onnx import numpy_helper, helper, TensorProto

m = onnx.load(sys.argv[1]); g = m.graph
casts, keep = [], []
for init in g.initializer:
    if init.data_type == TensorProto.FLOAT and np.prod(init.dims) > 1024:
        a = numpy_helper.to_array(init).astype(np.float16)
        half = numpy_helper.from_array(a, init.name + "__fp16")
        keep.append(half)
        casts.append(helper.make_node("Cast", [half.name], [init.name], to=TensorProto.FLOAT, name=init.name + "__cast"))
    else:
        keep.append(init)
del g.initializer[:]; g.initializer.extend(keep)
nodes = list(g.node); del g.node[:]; g.node.extend(casts + nodes)
onnx.checker.check_model(m)
onnx.save(m, sys.argv[2])
print(len(casts), "pesi in float16")
