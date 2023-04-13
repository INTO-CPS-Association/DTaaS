FROM python:3.9-slim

WORKDIR /auth

COPY requirements.txt requirements.txt
RUN pip install -r requirements.txt

COPY . .

EXPOSE 8090

CMD ["python", "auth.py"]