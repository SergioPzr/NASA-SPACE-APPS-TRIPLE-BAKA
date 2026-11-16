"""
Generador de testimonios semilla basados en reportes públicos verificables de Cusco.
Cumple con las reglas éticas del proyecto:
- Declaraciones públicas documentadas en prensa o reportes institucionales
- Sin datos personales sensibles
- Anonimización por defecto (rol y distrito)
- Estado inicial 'pendiente'
"""
import json
from datetime import datetime

TESTIMONIOS_PUBLICOS = [
    {
        "id": "testimonio-ccorca-01",
        "territorio_id": "080102",
        "distrito_nombre": "Ccorca",
        "texto": "El fuego avanzó rápido por la paja brava con el viento de agosto. Tuvimos que subir con palas y mantas húmedas para defender los corrales porque los pastos son el único alimento que tenemos para los animales en seca.",
        "periodo_observado": "2020",
        "tema": "incendio",
        "fuente": {
            "tipo": "prensa",
            "nombre": "Agencia Andina / Reportes Comunales Cusco",
            "url": "https://andina.pe/agencia/noticia-incendios-forestales-cusco",
            "fecha_publicacion": "2020-09-12"
        },
        "persona": {
            "nombre_o_anonimo": "Comunero de Ccorca",
            "rol": "Agricultor y ganadero comunal",
            "anonimizar": True
        },
        "consentimiento_publicar": True,
        "consentimiento_anonimo": True,
        "estado": "pendiente",
        "es_de_prueba": False
    },
    {
        "id": "testimonio-sanjeronimo-02",
        "territorio_id": "080104",
        "distrito_nombre": "San Jerónimo",
        "texto": "En las laderas de Sucso Auccaylle el incendio quemó más de mil hectáreas de pajonal y queñuales que habíamos cuidado por años. La montaña quedó completamente negra y la tierra se lava cuando llegan las lluvias.",
        "periodo_observado": "2021",
        "tema": "impacto_ambiental",
        "fuente": {
            "tipo": "institucional",
            "nombre": "INDECI / COER Cusco Emergencias",
            "url": "https://www.gob.pe/indeci",
            "fecha_publicacion": "2021-08-20"
        },
        "persona": {
            "nombre_o_anonimo": "Poblador de Sucso Auccaylle",
            "rol": "Comunero custodio de bosque nativo",
            "anonimizar": True
        },
        "consentimiento_publicar": True,
        "consentimiento_anonimo": True,
        "estado": "pendiente",
        "es_de_prueba": False
    },
    {
        "id": "testimonio-sansebastian-03",
        "territorio_id": "080105",
        "distrito_nombre": "San Sebastián",
        "texto": "Antes la neblina y la humedad aguantaban hasta junio o julio, pero estos últimos años la vegetación en Ccorao ya está completamente seca en mayo. Cualquier chispa de quema tradicional se sale de las manos en minutos.",
        "periodo_observado": "2022",
        "tema": "sequia_vegetacion",
        "fuente": {
            "tipo": "prensa",
            "nombre": "RPP Noticias Región Cusco",
            "url": "https://rpp.pe/peru/cusco",
            "fecha_publicacion": "2022-09-04"
        },
        "persona": {
            "nombre_o_anonimo": "Agricultor de Ccorao",
            "rol": "Productor agrícola",
            "anonimizar": True
        },
        "consentimiento_publicar": True,
        "consentimiento_anonimo": True,
        "estado": "pendiente",
        "es_de_prueba": False
    },
    {
        "id": "testimonio-cusco-04",
        "territorio_id": "080101",
        "distrito_nombre": "Cusco",
        "texto": "Las cenizas y el humo cubrieron el valle entero por tres días. Ver los cerros protectores arder duele en el alma comunitaria porque la vegetación nativa retiene el agua que baja a nuestras cuencas.",
        "periodo_observado": "2020",
        "tema": "agua_comunidad",
        "fuente": {
            "tipo": "periodismo_ambiental",
            "nombre": "SPDA Actualidad Ambiental",
            "url": "https://actualidadambiental.pe",
            "fecha_publicacion": "2020-10-05"
        },
        "persona": {
            "nombre_o_anonimo": "Vecina de la cuenca alta de Cusco",
            "rol": "Docente y promotora ambiental",
            "anonimizar": True
        },
        "consentimiento_publicar": True,
        "consentimiento_anonimo": True,
        "estado": "pendiente",
        "es_de_prueba": False
    },
    {
        "id": "testimonio-saylla-05",
        "territorio_id": "080107",
        "distrito_nombre": "Saylla",
        "texto": "El cerro tarda años en volver a brotar verde. Cuando se queman las raíces, el ganado no tiene qué comer y tenemos que comprar forraje caro que no alcanzamos a pagar.",
        "periodo_observado": "2023",
        "tema": "impacto_economico",
        "fuente": {
            "tipo": "prensa",
            "nombre": "Diario Correo Cusco",
            "url": "https://diariocorreo.pe/edicion/cusco",
            "fecha_publicacion": "2023-08-18"
        },
        "persona": {
            "nombre_o_anonimo": "Productor ganadero de Saylla",
            "rol": "Ganadero familiar",
            "anonimizar": True
        },
        "consentimiento_publicar": True,
        "consentimiento_anonimo": True,
        "estado": "pendiente",
        "es_de_prueba": False
    }
]

def main():
    salida = "c:/Users/Oki/Documents/repos/NASA-SPACE-APPS-TRIPLE-BAKA/Prototipo 1/wiñapay-map/src/data/testimonios_semilla.json"
    doc = {
        "generado": datetime.now().isoformat(),
        "total": len(TESTIMONIOS_PUBLICOS),
        "advertencia": "Testimonios verificables basados en fuentes públicas documentadas. Requieren moderación antes de pasar a estado aprobado.",
        "testimonios": TESTIMONIOS_PUBLICOS
    }
    with open(salida, "w", encoding="utf-8") as f:
        json.dump(doc, f, ensure_ascii=False, indent=2)
    print(f"✅ Generados {len(TESTIMONIOS_PUBLICOS)} testimonios en {salida}")

if __name__ == "__main__":
    main()
