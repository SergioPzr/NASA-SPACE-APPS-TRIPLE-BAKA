import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = { title: 'Acerca de WIÑAPAY' };

export default function Acerca() {
  return (
    <main className="pagina">
      <h1>Acerca de WIÑAPAY</h1>
      <p className="bajada">«El territorio cambia. Hagámoslo visible.» Una herramienta para que comunidades locales, ONG y empresas benéficas vean cómo cambió el verdor de la provincia de Cusco, y cuánta certeza hay detrás.</p>

      <section className="panel aviso" aria-labelledby="estado">
        <h2 id="estado" style={{ marginTop: 0 }}>Estado de los datos</h2>
        <ul className="lista">
          <li><strong>NDVI (real y validado):</strong> MODIS MOD13Q1 v061, 250 m, compuestos de 16 días, 2001–2025, con filtro de calidad QA estricto.</li>
          <li><strong>Límites y relieve (reales):</strong> 8 distritos oficiales de la provincia de Cusco (INEI) y curvas de nivel de NASADEM (cada 100 m).</li>
          <li><strong>Áreas quemadas (reales y validadas):</strong> producto satelital NASA MCD64A1 v061 (500 m, 2001–2025), extrayendo 16 polígonos reales de cicatrices de incendios en la provincia.</li>
        </ul>
      </section>

      <h2>Una sola variable</h2>
      <p>La variable es el NDVI, un índice de verdor de la vegetación. Los incendios no son una segunda variable: son una máscara para decidir dónde mirar.</p>

      <h2>Cómo decidimos qué es un cambio real</h2>
      <p>Para cada distrito calculamos el NDVI de tres maneras: la media del año, el máximo del año y la media de la estación seca (mayo a septiembre). En cada una aplicamos la prueba de Mann-Kendall (95 %) y la pendiente de Sen.</p>
      <p>Las tres se muestran juntas, porque elegir la que da significancia sería hacer trampa: con estos mismos datos, una medida puede dar «cambio» y otra «nada». Además corregimos por mirar ocho distritos a la vez (Benjamini–Hochberg). Solo hablamos de evidencia suficiente cuando todo coincide. Si no, decimos: <em>aún no hay evidencia suficiente</em>.</p>

      <h2>Límites que conviene conocer</h2>
      <ul className="lista">
        <li>250 m de resolución: los distritos pequeños o urbanos, como Wanchaq, tienen muy pocos píxeles y resultados poco estables.</li>
        <li>Veinticinco años son pocos puntos anuales; una tendencia significativa no dice por qué cambió el verdor.</li>
        <li>«Apagar» una mancha es una forma de explorar los datos, no combate real del fuego.</li>
      </ul>

      <h2>Funciona sin conexión</h2>
      <p>Después de la primera visita, la app guarda el mapa, los resultados y las páginas en tu dispositivo. Si envías un testimonio sin red, queda en cola y se manda cuando vuelve la conexión.</p>

      <h2>Privacidad</h2>
      <p>Los testimonios y las iniciativas se publican solo con tu consentimiento y después de moderación. No publicamos teléfonos, correos ni nombres completos. El contacto opcional de las iniciativas solo lo ve quien modera.</p>

      <h2>Fuentes</h2>
      <ul className="lista">
        <li>NASA LP DAAC · MOD13Q1 v061 (NDVI) y MCD64A1 v061 (área quemada), vía AppEEARS.</li>
        <li>NASADEM 30 m (relieve) · INEI (límites distritales).</li>
      </ul>
      <p>Proyecto para el NASA Space Apps Challenge 2026. <Link href="/mapa">Volver al mapa</Link>.</p>
    </main>
  );
}
