"""Create a clearly labeled draft packet from the project docs and verified web screenshots."""
from pathlib import Path
import re, html
from reportlab.platypus import SimpleDocTemplate,Paragraph,Spacer,PageBreak,Table,TableStyle,Image,KeepTogether
from reportlab.lib.styles import getSampleStyleSheet,ParagraphStyle
from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.utils import ImageReader
root=Path(__file__).resolve().parents[1]
out=root/'output/submission/SafelyGo-submission-draft.pdf'
out.parent.mkdir(parents=True,exist_ok=True)
styles=getSampleStyleSheet()
styles.add(ParagraphStyle(name='BodySG',fontName='Helvetica',fontSize=10,leading=14,textColor=colors.HexColor('#15294A'),spaceAfter=7))
styles.add(ParagraphStyle(name='TitleSG',fontName='Helvetica-Bold',fontSize=28,leading=34,textColor=colors.HexColor('#174CCB'),spaceAfter=18))
styles.add(ParagraphStyle(name='HeadingSG',fontName='Helvetica-Bold',fontSize=15,leading=20,textColor=colors.HexColor('#174CCB'),spaceAfter=10,spaceBefore=10,keepWithNext=True))
styles.add(ParagraphStyle(name='SmallSG',fontName='Helvetica',fontSize=8,leading=11,textColor=colors.HexColor('#526580'),spaceAfter=7,wordWrap='CJK'))
styles.add(ParagraphStyle(name='CellSG',fontName='Helvetica',fontSize=8,leading=11,textColor=colors.HexColor('#15294A')))
B=styles['BodySG'];H=styles['HeadingSG'];S=styles['SmallSG']
def clean(s):
    s=s.replace('–','-').replace('—','-').replace('≤','<=').replace('→','to').replace('’',"'").replace('“','"').replace('”','"')
    s=re.sub(r'\[([^]]+)\]\(([^)]+)\)',r'\1 (\2)',s)
    s=html.escape(s)
    s=re.sub(r'\*\*(.+?)\*\*',r'<b>\1</b>',s)
    return s.replace('`','')
def p(s,style=B):return Paragraph(clean(s),style)
def markdown(path):
    result=[];lines=path.read_text().splitlines();i=0
    while i<len(lines):
        line=lines[i].strip()
        if not line:i+=1;continue
        if line.startswith('|'):
            rows=[]
            while i<len(lines) and lines[i].strip().startswith('|'):
                cells=[c.strip() for c in lines[i].strip().strip('|').split('|')]
                if not all(re.match(r'^:?-+:?$',c) for c in cells):rows.append([p(c,styles['CellSG']) for c in cells])
                i+=1
            widths=[500/len(rows[0])]*len(rows[0]);table=Table(rows,colWidths=widths,repeatRows=1,hAlign='LEFT')
            table.setStyle(TableStyle([('BACKGROUND',(0,0),(-1,0),colors.HexColor('#EFF5FF')),('GRID',(0,0),(-1,-1),.4,colors.HexColor('#D7E2F1')),('VALIGN',(0,0),(-1,-1),'TOP'),('TOPPADDING',(0,0),(-1,-1),6),('BOTTOMPADDING',(0,0),(-1,-1),6)]));result.extend([table,Spacer(1,12)]);continue
        if line.startswith('#'):
            if line.startswith('## Submission checklist'): result.append(PageBreak())
            result.append(p(line.lstrip('# ').strip(),H));i+=1;continue
        if line.startswith('- '):result.append(p('• '+line[2:],B));i+=1;continue
        text=line;i+=1
        while i<len(lines) and lines[i].strip() and not lines[i].strip().startswith(('#','- ','|')):
            text+=' '+lines[i].strip();i+=1
        result.append(p(text,B))
    return result
story=[p('SafelyGo',styles['TitleSG']),p('Student Campus Safety App',H),p('Competition submission draft - September 30, 2026',B),Spacer(1,24),p('This packet is a preparation artifact. It is not ready for competition upload.',H)]
for text in ['Contestant name and ID: awaiting contestant details.','Mobile installation URL: awaiting signed Android/iOS build and public access URL.','Source archive: SafelyGo-source.zip accompanies this draft. Add its hosted download link using the advisor-confirmed submission method.','Signed BPA Release Forms and official AI Usage and Documentation Form must be completed and appended.','Works Cited must be checked against the full BPA Style & Reference Manual.','Final deadline: January 15, 2027, 11:59 p.m. Eastern. Required final filename: V05-ContestantID.pdf.']:
 story.append(p(text))
story.extend([Spacer(1,16),p('Implemented project',H),p('React Native + Expo mobile client, multi-campus PostgreSQL backend, Railway deployment configuration, account recovery, safety reports, emergency directory, trusted-contact location sharing, live map and staff administration.')])
for file in ['PROJECT_DESCRIPTION.md','PROJECT_PLAN.md','VALIDATION_RESULTS.md']:
 story.append(PageBreak());story.extend(markdown(root/'docs'/file))
for title,pair in [('Student home and campus map',['home.png','map.png']),('Safety reports and staff administration',['reports.png','staff.png']),('Location sharing and emergency directory',['sharing.png','help.png'])]:
 story.extend([PageBreak(),p(title,H),p('Screenshots of the supplementary Expo web preview at a mobile viewport. Fictional demo campus. Replace or supplement with installed native-device screenshots for final judging.',S)])
 cells=[]
 for name in pair:
  path=root/'output/playwright'/name
  w,h=ImageReader(str(path)).getSize();scale=min(235/w,535/h)
  cells.append(Image(str(path),width=w*scale,height=h*scale))
 table=Table([cells],colWidths=[250,250],hAlign='LEFT');table.setStyle(TableStyle([('VALIGN',(0,0),(-1,-1),'TOP')]));story.append(table)
for file in ['SOURCES.md','AI_USAGE.md','REQUIREMENTS.md']:
 story.append(PageBreak());story.extend(markdown(root/'docs'/file))
def footer(canvas,doc):
 canvas.setStrokeColor(colors.HexColor('#D7E2F1'));canvas.line(48,42,548,42);canvas.setFont('Helvetica',8);canvas.setFillColor(colors.HexColor('#526580'));canvas.drawString(48,29,'SafelyGo | Draft - official forms and live URLs pending');canvas.drawRightString(548,29,str(doc.page))
SimpleDocTemplate(str(out),pagesize=(612,792),rightMargin=64,leftMargin=48,topMargin=44,bottomMargin=56,title='SafelyGo Competition Submission Draft',author='SafelyGo project').build(story,onFirstPage=footer,onLaterPages=footer)
print(out)
