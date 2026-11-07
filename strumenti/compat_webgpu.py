"""Rende un modello ONNX compatibile con i limiti minimi di WebGPU.

Uso: python compat_webgpu.py <ingresso.onnx> <uscita.onnx>
WebGPU garantisce solo 8 buffer per stadio di calcolo. Un Concat con più di 6
ingressi (più l'uscita e i parametri) supera il limite su molte GPU e il browser
scarta l'operazione senza errore visibile. Qui ogni Concat lungo diventa un
albero di Concat da al massimo 6 ingressi: stesso risultato, più passaggi.
"""
import sys, onnx
from onnx import helper

MAX = 6
m = onnx.load(sys.argv[1]); g = m.graph
out, n_split = [], 0
for node in g.node:
    ins = [i for i in node.input if i]
    if node.op_type != "Concat" or len(ins) <= MAX:
        out.append(node); continue
    axis = next(a.i for a in node.attribute if a.name == "axis")
    level, k = ins, 0
    while len(level) > MAX:
        nxt = []
        for j in range(0, len(level), MAX):
            grp = level[j:j + MAX]
            if len(grp) == 1: nxt.append(grp[0]); continue
            name = f"{node.name or node.output[0]}__parte{k}"; k += 1
            out.append(helper.make_node("Concat", grp, [name], axis=axis, name=name)); nxt.append(name)
        level = nxt
    out.append(helper.make_node("Concat", level, list(node.output), axis=axis, name=node.name)); n_split += 1
del g.node[:]; g.node.extend(out)
onnx.checker.check_model(m); onnx.save(m, sys.argv[2])
print(n_split, "Concat divisi")
